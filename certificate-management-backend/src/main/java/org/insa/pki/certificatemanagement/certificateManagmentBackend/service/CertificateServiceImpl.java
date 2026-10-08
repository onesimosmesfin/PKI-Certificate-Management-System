package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.*;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.PKCS10CertificationRequest;
import org.bouncycastle.util.io.pem.PemReader;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignCsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.CertificateRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.CsrRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.RevokedCertificateRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.ca.CertificateProfileService;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.StringReader;
import java.io.StringWriter;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CertificateServiceImpl implements CertificateService {

    private final CertificateRepository certificateRepository;
    private final CsrRepository csrRepository;
    private final AuditService auditService;
    private final CertificateProfileService profileService;
    private final RevokedCertificateRepository revokedRepository;
    private final org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.KeyRepository keyRepository;
    public CertificateServiceImpl(
            CertificateRepository certificateRepository,
            CsrRepository csrRepository,
            AuditService auditService,
            CertificateProfileService profileService,
            RevokedCertificateRepository revokedRepository,
            org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.KeyRepository keyRepository
    ) {
        this.certificateRepository = certificateRepository;
        this.csrRepository = csrRepository;
        this.auditService = auditService;
        this.profileService = profileService;
        this.revokedRepository=revokedRepository;
        this.keyRepository=keyRepository;
    }

    // =========================================================
    // SIGN CSR
    // =========================================================
    @Override
    public String signCsr(SignCsrRequest request) throws Exception {



        if (request.getCsrId() == null) {
            throw new RuntimeException("CSR ID is required");
        }

        if (request.getPin() == null || request.getPin().isBlank()) {
            throw new RuntimeException("HSM PIN is required");
        }

        if (request.getCaAlias() == null || request.getCaAlias().isBlank()) {
            throw new RuntimeException("CA alias is required");
        }
        if (request.getValidityDays() <= 0) {
            throw new IllegalArgumentException("Certificate validity must be at least one day");
        }

        CsrEntity csrEntity = csrRepository.findById(request.getCsrId())
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        if (Boolean.TRUE.equals(csrEntity.getIssued()) || "SIGNED".equalsIgnoreCase(csrEntity.getStatus())) {
            throw new IllegalStateException("This CSR has already been signed");
        }

        String csrPem = csrEntity.getCsrPem();

        Provider provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (provider == null) {
            provider = Application.registerSoftHsmProvider();
        }

        char[] pin = request.getPin().toCharArray();

        KeyStore ks = KeyStore.getInstance("PKCS11", provider);
        ks.load(null, pin);

        Key key = ks.getKey(request.getCaAlias(), null);

        if (!(key instanceof PrivateKey caPrivateKey)) {
            throw new RuntimeException(
                    "CA private key not found for alias: " + request.getCaAlias()
            );
        }

        X509Certificate caCert =
                (X509Certificate) ks.getCertificate(request.getCaAlias());

        if (caCert == null) {
            throw new RuntimeException(
                    "CA certificate not found for alias: " + request.getCaAlias()
            );
        }

        PemReader reader = new PemReader(new StringReader(csrPem));

        PKCS10CertificationRequest csr =
                new PKCS10CertificationRequest(reader.readPemObject().getContent());

        X500Name subject = csr.getSubject();

        PublicKey publicKey =
                new JcaPEMKeyConverter()
                        .setProvider("BC")
                        .getPublicKey(csr.getSubjectPublicKeyInfo());

        if (!csr.isSignatureValid(
                new org.bouncycastle.operator.jcajce.JcaContentVerifierProviderBuilder()
                        .setProvider("BC")
                        .build(publicKey))) {
            throw new IllegalArgumentException("CSR signature is invalid");
        }

        Date notBefore = new Date();

        Date notAfter = new Date(
                System.currentTimeMillis()
                        + ((long) request.getValidityDays() * 86400000L)
        );

        BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());

        JcaX509v3CertificateBuilder builder =
                new JcaX509v3CertificateBuilder(
                        caCert,
                        serial,
                        notBefore,
                        notAfter,
                        subject,
                        publicKey
                );

        boolean isCa = Boolean.TRUE.equals(csrEntity.getCa());
        builder.addExtension(
                Extension.basicConstraints,
                true,
                isCa && csrEntity.getPathLength() != null
                        ? new BasicConstraints(csrEntity.getPathLength())
                        : new BasicConstraints(isCa)
        );

        addRequestedKeyUsage(builder, csrEntity);
        addRequestedSubjectAlternativeNames(builder, csrEntity);

        builder.addExtension(
                Extension.subjectKeyIdentifier,
                false,
                new SubjectKeyIdentifier(publicKey.getEncoded())
        );

        builder.addExtension(
                Extension.authorityKeyIdentifier,
                false,
                new AuthorityKeyIdentifier(caCert.getPublicKey().getEncoded())
        );

        ContentSigner signer =
                new JcaContentSignerBuilder(signingAlgorithmFor(caPrivateKey))
                        .setProvider(provider)
                        .build(caPrivateKey);

        X509Certificate issuedCert =
                new JcaX509CertificateConverter()
                        .setProvider("BC")
                        .getCertificate(builder.build(signer));

        StringWriter sw = new StringWriter();

        try (JcaPEMWriter writer = new JcaPEMWriter(sw)) {
            writer.writeObject(issuedCert);
        }

        String pem = sw.toString();

        CertificateEntity cert = new CertificateEntity();

        cert.setAlias(csrEntity.getCsrAlias());
        cert.setKeyAlias(csrEntity.getKeyAlias());
        cert.setCertificate(pem);
        cert.setType("SIGNED_CERT");
        cert.setStatus("ACTIVE");
        cert.setSerialNumber(serial.toString());
        cert.setIssuerAlias(request.getCaAlias());

        cert.setSubject(subject.toString());
        cert.setIssuer(
                caCert.getSubjectX500Principal().getName()
        );
        cert.setCommonName(csrEntity.getCommonName());
        cert.setOrganization(csrEntity.getOrganization());
        cert.setOrganizationalUnit(csrEntity.getOrganizationalUnit());
        cert.setCountry(csrEntity.getCountry());
        cert.setState(csrEntity.getState());
        cert.setLocality(csrEntity.getLocality());
        cert.setEmail(csrEntity.getEmail());

        cert.setSignatureAlgorithm(issuedCert.getSigAlgName());

        cert.setCa(csrEntity.getCa());
        cert.setPathLength(csrEntity.getPathLength());

        cert.setCreatedAt(LocalDateTime.now());

        cert.setExpiryDate(
                LocalDateTime.now().plusDays(request.getValidityDays())
        );

        cert.setCreatedBy(
                csrEntity.getCreatedBy() != null && !csrEntity.getCreatedBy().isBlank()
                        ? csrEntity.getCreatedBy()
                        : getCurrentUser()
        );

        cert.setKeyUsages(
                csrEntity.getKeyUsages() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(csrEntity.getKeyUsages())
        );

        cert.setExtendedKeyUsages(
                csrEntity.getExtendedKeyUsages() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(csrEntity.getExtendedKeyUsages())
        );

        cert.setDnsNames(
                csrEntity.getDnsNames() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(csrEntity.getDnsNames())
        );

        cert.setIpAddresses(
                csrEntity.getIpAddresses() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(csrEntity.getIpAddresses())
        );

        cert.setCrlUrls(
                csrEntity.getCrlUrls() == null
                        ? new ArrayList<>()
                        : new ArrayList<>(csrEntity.getCrlUrls())
        );

        certificateRepository.save(cert);

        csrEntity.setIssued(true);
        csrEntity.setStatus("SIGNED");

        csrRepository.save(csrEntity);

        // =========================================================
        // AUDIT
        // =========================================================
        AuditContext audit = new AuditContext();

        audit.setUser(getCurrentUser());
        audit.setAction("SIGN_CERTIFICATE");
        audit.setTarget(cert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/sign");
        audit.setCorrelationId(UUID.randomUUID().toString());
        audit.setStatus(AuditStatus.SUCCESS);
        audit.setDetails("CSR signed successfully");

        auditService.log(audit);

        return pem;
    }

    // =========================================================
    // GET CERTIFICATE BY ID
    // =========================================================
    @Override
    public CertificateDTO getCertificateById(Long id) {

        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Certificate not found")
                );

        AuditContext audit = new AuditContext();

        audit.setUser(getCurrentUser());
        audit.setAction("VIEW_CERTIFICATE");
        audit.setTarget(cert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/" + id);
        audit.setCorrelationId(UUID.randomUUID().toString());
        audit.setStatus(AuditStatus.SUCCESS);
        audit.setDetails("Certificate viewed");

        auditService.log(audit);

        return toDto(cert);
    }

    // =========================================================
    // DOWNLOAD PEM
    // =========================================================
    @Override
    public String downloadPem(Long id) {

        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Certificate not found")
                );

        AuditContext audit = new AuditContext();

        audit.setUser(getCurrentUser());
        audit.setAction("DOWNLOAD_PEM");
        audit.setTarget(cert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/" + id + "/pem");
        audit.setCorrelationId(UUID.randomUUID().toString());
        audit.setStatus(AuditStatus.SUCCESS);
        audit.setDetails("Certificate PEM downloaded");

        auditService.log(audit);

        return cert.getCertificate();
    }

    // =========================================================
    // VERIFY CERTIFICATE
    // =========================================================
    @Override
    public boolean verifyCertificate(Long id) {

        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Certificate not found")
                );

        boolean valid =
                "ACTIVE".equalsIgnoreCase(cert.getStatus());

        AuditContext audit = new AuditContext();

        audit.setUser(getCurrentUser());
        audit.setAction("VERIFY_CERTIFICATE");
        audit.setTarget(cert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/" + id + "/verify");
        audit.setCorrelationId(UUID.randomUUID().toString());
        audit.setStatus(valid?AuditStatus.SUCCESS:AuditStatus.FAILED);
        audit.setDetails("Certificate verification executed");

        auditService.log(audit);

        return valid;
    }

    // =========================================================
    // REVOKE CERTIFICATE
    // =========================================================
    @Override
    public void revokeCertificate(Long id, String reason) {

        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException("Certificate not found")
                );

        if ("REVOKED".equalsIgnoreCase(cert.getStatus())) {
            throw new RuntimeException("Certificate already revoked");
        }

        RevocationReason revocationReason;

        try {

            revocationReason =
                    RevocationReason.valueOf(
                            reason.toUpperCase()
                    );

        } catch (Exception ex) {

            throw new RuntimeException(
                    "Invalid revocation reason"
            );
        }

        String currentUser = getCurrentUser();

        String correlationId = UUID.randomUUID().toString();

        // =========================================
        // UPDATE CERTIFICATE
        // =========================================

        cert.setStatus("REVOKED");

        cert.setRevocationReason(
                revocationReason.name()
        );

        cert.setRevokedAt(LocalDateTime.now());

        cert.setRevokedBy(currentUser);

        certificateRepository.save(cert);

        // =========================================
        // SYNCHRONIZE CSR STATUS
        // =========================================
        csrRepository.findAll().stream()
                .filter(csr -> (cert.getAlias() != null && cert.getAlias().equalsIgnoreCase(csr.getCsrAlias()))
                            || (cert.getCommonName() != null && cert.getCommonName().equalsIgnoreCase(csr.getCommonName())))
                .forEach(csr -> {
                    csr.setStatus("REVOKED");
                    csrRepository.save(csr);
                });

        // =========================================
        // STORE IN REVOKED TABLE
        // =========================================

        RevokedCertificate revoked =
                new RevokedCertificate();

        revoked.setCertificateAlias(
                cert.getAlias()
        );

        revoked.setIssuerAlias(
                cert.getIssuerAlias()
        );

        revoked.setSerialNumber(
                cert.getSerialNumber()
        );

        revoked.setReason(
                revocationReason
        );

        revoked.setRevocationDate(
                new Date()
        );

        // =========================================
        // FIX HERE
        // =========================================

        revoked.setRevokedBy(currentUser);

        revoked.setCorrelationId(correlationId);

        revokedRepository.save(revoked);

        // =========================================
        // AUDIT
        // =========================================

        AuditContext audit = new AuditContext();

        audit.setUser(currentUser);

        audit.setAction("REVOKE_CERTIFICATE");

        audit.setTarget(cert.getAlias());

        audit.setIp("SYSTEM");

        audit.setEndpoint(
                "/api/certificates/" + id + "/revoke"
        );

        audit.setCorrelationId(correlationId);

        audit.setStatus(AuditStatus.SUCCESS);

        audit.setDetails(
                "Certificate revoked. Reason: "
                        + revocationReason.name()
        );

        auditService.log(audit);
    }

    // =========================================================
    // DTO MAPPER
    // =========================================================
    public CertificateDTO toDto(CertificateEntity cert) {

        CertificateDTO dto = new CertificateDTO();

        dto.setId(cert.getId());
        dto.setAlias(cert.getAlias());
        dto.setIssuerAlias(cert.getIssuerAlias());
        dto.setSubject(cert.getSubject());
        dto.setSerialNumber(cert.getSerialNumber());
        dto.setSignatureAlgorithm(cert.getSignatureAlgorithm());
        dto.setType(cert.getType());
        dto.setStatus(cert.getStatus());

        dto.setCreatedAt(cert.getCreatedAt());
        dto.setExpiryDate(cert.getExpiryDate());

        dto.setCertificatePem(cert.getCertificate());

        dto.setValidityPercentage(
                calculateValidityPercentage(
                        cert.getCreatedAt(),
                        cert.getExpiryDate()
                )
        );

        return dto;
    }

    // =========================================================
    // VALIDITY PERCENTAGE
    // =========================================================
    private double calculateValidityPercentage(
            LocalDateTime createdAt,
            LocalDateTime expiryDate
    ) {

        if (createdAt == null || expiryDate == null) {
            return 0;
        }

        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(createdAt)) {
            return 0;
        }

        if (now.isAfter(expiryDate)) {
            return 100;
        }

        long totalMillis =
                java.time.Duration
                        .between(createdAt, expiryDate)
                        .toMillis();

        long elapsedMillis =
                java.time.Duration
                        .between(createdAt, now)
                        .toMillis();

        if (totalMillis <= 0) {
            return 100;
        }

        double percentage =
                ((double) elapsedMillis / totalMillis)
                        * 100.0;

        return Math.min(
                100,
                Math.max(0, percentage)
        );
    }

    // =========================================================
    // GET CA CERTIFICATES
    // =========================================================
    @Override
    public List<CertificateEntity> getCaCertificates() {

        return certificateRepository.findAll()
                .stream()
                .filter(cert ->
                        cert.getType() != null &&
                                (
                                        cert.getType().equalsIgnoreCase("ROOT_CA") ||
                                                cert.getType().equalsIgnoreCase("INTERMEDIATE_CA") ||
                                                cert.getType().equalsIgnoreCase("CA")
                                )
                )
                .toList();
    }


    @Override
    public List<CertificateEntity> getMyCertificates() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String currentUser = authentication.getName();

        return certificateRepository.findByCreatedBy(currentUser);
    }

    // =========================================================
    // GET CURRENT USER
    // =========================================================
    private String getCurrentUser() {

        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();
    }

    private String signingAlgorithmFor(PrivateKey key) {
        return switch (key.getAlgorithm().toUpperCase(Locale.ROOT)) {
            case "EC", "ECDSA" -> "SHA256withECDSA";
            case "ED25519" -> "Ed25519";
            case "ED448" -> "Ed448";
            default -> "SHA256withRSA";
        };
    }

    private void addRequestedKeyUsage(JcaX509v3CertificateBuilder builder, CsrEntity csr) throws Exception {
        if (csr.getKeyUsages() == null || csr.getKeyUsages().isEmpty()) {
            return;
        }

        int usage = 0;
        for (String value : csr.getKeyUsages()) {
            if (value == null) continue;
            usage |= switch (value) {
                case "digitalSignature" -> KeyUsage.digitalSignature;
                case "nonRepudiation" -> KeyUsage.nonRepudiation;
                case "keyEncipherment" -> KeyUsage.keyEncipherment;
                case "dataEncipherment" -> KeyUsage.dataEncipherment;
                case "keyAgreement" -> KeyUsage.keyAgreement;
                case "keyCertSign" -> KeyUsage.keyCertSign;
                case "cRLSign" -> KeyUsage.cRLSign;
                default -> 0;
            };
        }
        if (usage != 0) {
            builder.addExtension(Extension.keyUsage, true, new KeyUsage(usage));
        }
    }

    private void addRequestedSubjectAlternativeNames(JcaX509v3CertificateBuilder builder, CsrEntity csr)
            throws Exception {
        List<GeneralName> names = new ArrayList<>();
        if (csr.getDnsNames() != null) {
            for (String dns : csr.getDnsNames()) {
                if (dns != null && !dns.isBlank()) names.add(new GeneralName(GeneralName.dNSName, dns));
            }
        }
        if (csr.getIpAddresses() != null) {
            for (String ip : csr.getIpAddresses()) {
                if (ip != null && !ip.isBlank()) names.add(new GeneralName(GeneralName.iPAddress, ip));
            }
        }
        if (!names.isEmpty()) {
            builder.addExtension(Extension.subjectAlternativeName, false,
                    new GeneralNames(names.toArray(new GeneralName[0])));
        }
    }

    // =========================================================
    // IMPORT CERTIFICATE (PEM)
    // =========================================================
    @Override
    public String importCertificate(
            org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateImportRequest request
    ) throws Exception {

        if (request.getAlias() == null || request.getAlias().isBlank()) {
            throw new RuntimeException("Alias is required");
        }
        if (request.getCertificate() == null || request.getCertificate().isBlank()) {
            throw new RuntimeException("Certificate PEM is required");
        }

        // Parse the PEM into an X509 certificate
        java.security.cert.X509Certificate cert;
        try (org.bouncycastle.openssl.PEMParser parser =
                     new org.bouncycastle.openssl.PEMParser(
                             new java.io.StringReader(request.getCertificate()))) {
            Object obj = parser.readObject();
            if (!(obj instanceof org.bouncycastle.cert.X509CertificateHolder)) {
                throw new RuntimeException("Invalid PEM: not an X.509 certificate");
            }
            cert = new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                    .setProvider("BC")
                    .getCertificate((org.bouncycastle.cert.X509CertificateHolder) obj);
        }

        // Save the certificate entity
        CertificateEntity entity = new CertificateEntity();
        entity.setAlias(request.getAlias());
        entity.setCertificate(request.getCertificate());
        entity.setSubject(cert.getSubjectX500Principal().getName());
        entity.setIssuer(cert.getIssuerX500Principal().getName());
        entity.setSerialNumber(cert.getSerialNumber().toString());
        entity.setSignatureAlgorithm(cert.getSigAlgName());
        entity.setType("IMPORTED");
        entity.setStatus("ACTIVE");
        entity.setCreatedAt(LocalDateTime.now());
        entity.setExpiryDate(LocalDateTime.ofInstant(cert.getNotAfter().toInstant(), java.time.ZoneId.systemDefault()));
        entity.setCreatedBy(getCurrentUser());

        certificateRepository.save(entity);

        return "Certificate imported successfully: " + request.getAlias();
    }

    // =========================================================
    // EXPORT CERTIFICATE AS DER
    // =========================================================
    @Override
    public byte[] downloadDer(Long id) {
        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));
        try {
            java.security.cert.X509Certificate x509 = parsePem(cert.getCertificate());
            return x509.getEncoded();
        } catch (Exception e) {
            throw new RuntimeException("Failed to encode certificate as DER: " + e.getMessage(), e);
        }
    }

    // =========================================================
    // EXPORT CERTIFICATE AS PFX
    // =========================================================
    @Override
    public byte[] downloadPfx(Long id, String password) throws Exception {
        CertificateEntity certEntity = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        java.security.cert.X509Certificate x509 = parsePem(certEntity.getCertificate());

        // Only software-backed keys can be exported as PFX
        if (Boolean.TRUE.equals(certEntity.getCa())) {
            // For CA certificates, export the cert chain without private key
            java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
            ks.load(null, null);
            ks.setCertificateEntry(certEntity.getAlias(), x509);
            java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
            ks.store(out, password.toCharArray());
            return out.toByteArray();
        }

        // Software key: include the private key if stored
        KeyEntity keyEntity = keyRepository.findByAlias(certEntity.getKeyAlias()).orElse(null);
        if (keyEntity == null || keyEntity.getPrivateKey() == null) {
            throw new RuntimeException("Private key not available for PFX export (HSM keys cannot be exported)");
        }

        byte[] pkcs8 = java.util.Base64.getDecoder().decode(keyEntity.getPrivateKey());
        java.security.spec.PKCS8EncodedKeySpec spec = new java.security.spec.PKCS8EncodedKeySpec(pkcs8);
        java.security.KeyFactory kf = java.security.KeyFactory.getInstance(keyEntity.getAlgorithm(), "BC");
        java.security.PrivateKey priv = kf.generatePrivate(spec);

        java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS12");
        ks.load(null, null);
        ks.setKeyEntry(certEntity.getAlias(), priv, password.toCharArray(),
                new java.security.cert.Certificate[]{x509});

        java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
        ks.store(out, password.toCharArray());
        return out.toByteArray();
    }

    private java.security.cert.X509Certificate parsePem(String pem) throws Exception {
        try (org.bouncycastle.openssl.PEMParser parser =
                     new org.bouncycastle.openssl.PEMParser(new java.io.StringReader(pem))) {
            Object obj = parser.readObject();
            if (!(obj instanceof org.bouncycastle.cert.X509CertificateHolder)) {
                throw new RuntimeException("Not an X.509 certificate");
            }
            return new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                    .setProvider("BC")
                    .getCertificate((org.bouncycastle.cert.X509CertificateHolder) obj);
        }
    }

    // =========================================================
    // RENEW CERTIFICATE
    // =========================================================
    @Override
    public String renewCertificate(Long id,
            org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request) throws Exception {

        CertificateEntity oldCert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        if ("REVOKED".equalsIgnoreCase(oldCert.getStatus())) {
            throw new RuntimeException("Cannot renew a revoked certificate");
        }

        if (request.getAlias() == null || request.getAlias().isBlank()) {
            throw new RuntimeException("New certificate alias is required");
        }
        if (request.getValidityDays() <= 0) {
            throw new RuntimeException("Validity days must be positive");
        }

        java.security.cert.X509Certificate oldX509 = parsePem(oldCert.getCertificate());

        CertificateEntity issuerEntity = certificateRepository
                .findByAlias(oldCert.getIssuerAlias())
                .orElseThrow(() -> new RuntimeException("Issuer CA not found: " + oldCert.getIssuerAlias()));

        java.security.KeyStore ks = loadHsmKeyStore();
        java.security.PrivateKey caKey =
                (java.security.PrivateKey) ks.getKey(issuerEntity.getKeyAlias(), null);
        java.security.cert.X509Certificate caCert =
                (java.security.cert.X509Certificate) ks.getCertificate(issuerEntity.getKeyAlias());

        if (caKey == null || caCert == null) {
            throw new RuntimeException("Unable to load CA key or certificate from HSM");
        }

        java.security.PublicKey subjectPublicKey = oldX509.getPublicKey();

        org.bouncycastle.asn1.x500.X500Name issuerDN =
                new org.bouncycastle.asn1.x500.X500Name(caCert.getSubjectX500Principal().getName());
        org.bouncycastle.asn1.x500.X500Name subjectDN =
                new org.bouncycastle.asn1.x500.X500Name(oldX509.getSubjectX500Principal().getName());

        java.math.BigInteger serial = java.math.BigInteger.valueOf(System.currentTimeMillis());
        java.util.Date notBefore = new java.util.Date();
        java.util.Date notAfter = new java.util.Date(
                System.currentTimeMillis() + (long) request.getValidityDays() * 86400000L);

        org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder builder =
                new org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder(
                        issuerDN, serial, notBefore, notAfter, subjectDN, subjectPublicKey);

        builder.addExtension(org.bouncycastle.asn1.x509.Extension.basicConstraints,
                true, new org.bouncycastle.asn1.x509.BasicConstraints(false));
        builder.addExtension(org.bouncycastle.asn1.x509.Extension.keyUsage,
                true, new org.bouncycastle.asn1.x509.KeyUsage(
                        org.bouncycastle.asn1.x509.KeyUsage.digitalSignature
                        | org.bouncycastle.asn1.x509.KeyUsage.keyEncipherment));

        org.bouncycastle.operator.ContentSigner signer =
                new org.bouncycastle.operator.jcajce.JcaContentSignerBuilder("SHA256withRSA").build(caKey);

        org.bouncycastle.cert.X509CertificateHolder holder = builder.build(signer);

        java.security.cert.X509Certificate newCert =
                new org.bouncycastle.cert.jcajce.JcaX509CertificateConverter()
                        .setProvider("BC")
                        .getCertificate(holder);

        CertificateEntity newEntity = new CertificateEntity();
        newEntity.setAlias(request.getAlias());
        newEntity.setKeyAlias(oldCert.getKeyAlias());
        newEntity.setCertificate(toPemString(newCert));
        newEntity.setType(oldCert.getType());
        newEntity.setStatus("ACTIVE");
        newEntity.setSubject(newCert.getSubjectX500Principal().getName());
        newEntity.setIssuer(newCert.getIssuerX500Principal().getName());
        newEntity.setIssuerAlias(oldCert.getIssuerAlias());
        newEntity.setSerialNumber(newCert.getSerialNumber().toString());
        newEntity.setSignatureAlgorithm(newCert.getSigAlgName());
        newEntity.setCommonName(oldCert.getCommonName());
        newEntity.setOrganization(oldCert.getOrganization());
        newEntity.setOrganizationalUnit(oldCert.getOrganizationalUnit());
        newEntity.setCountry(oldCert.getCountry());
        newEntity.setState(oldCert.getState());
        newEntity.setLocality(oldCert.getLocality());
        newEntity.setCreatedAt(java.time.LocalDateTime.now());
        newEntity.setExpiryDate(java.time.LocalDateTime.ofInstant(
                newCert.getNotAfter().toInstant(), java.time.ZoneId.systemDefault()));
        newEntity.setCreatedBy(getCurrentUser());

        certificateRepository.save(newEntity);

        oldCert.setStatus("SUPERSEDED");
        certificateRepository.save(oldCert);

        AuditContext audit = new AuditContext();
        audit.setUser(getCurrentUser());
        audit.setAction("RENEW_CERTIFICATE");
        audit.setTarget(oldCert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/" + id + "/renew");
        audit.setCorrelationId(java.util.UUID.randomUUID().toString());
        audit.setStatus(AuditStatus.SUCCESS);
        audit.setDetails("Certificate renewed as " + request.getAlias());
        auditService.log(audit);

        return toPemString(newCert);
    }

    private java.security.KeyStore loadHsmKeyStore() throws Exception {
        java.security.Provider provider = java.security.Security.getProvider(
                org.insa.pki.certificatemanagement.certificateManagmentBackend.Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (provider == null) {
            provider = org.insa.pki.certificatemanagement.certificateManagmentBackend.Application.registerSoftHsmProvider();
        }
        java.security.KeyStore ks = java.security.KeyStore.getInstance("PKCS11", provider);
        ks.load(null, "12345678".toCharArray());
        return ks;
    }

    private String toPemString(java.security.cert.X509Certificate cert) throws Exception {
        java.io.StringWriter sw = new java.io.StringWriter();
        try (org.bouncycastle.openssl.jcajce.JcaPEMWriter pw = new org.bouncycastle.openssl.jcajce.JcaPEMWriter(sw)) {
            pw.writeObject(cert);
        }
        return sw.toString();
    }

    // =========================================================
    // GET ALL CERTIFICATES (for operators / admin)
    // =========================================================
    @Override
    public java.util.List<org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity> getAllCertificates() {
        return certificateRepository.findAll();
    }

    @Override
    public void deleteCertificate(Long id) {
        CertificateEntity cert = certificateRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Certificate not found"));

        certificateRepository.delete(cert);

        AuditContext audit = new AuditContext();
        audit.setUser(getCurrentUser());
        audit.setAction("DELETE_CERTIFICATE");
        audit.setTarget(cert.getAlias());
        audit.setIp("SYSTEM");
        audit.setEndpoint("/api/certificates/" + id);
        audit.setCorrelationId(UUID.randomUUID().toString());
        audit.setStatus(AuditStatus.SUCCESS);
        audit.setDetails("Certificate deleted successfully");

        auditService.log(audit);
    }

    // =========================================
    // HELPERS FOR approveAndIssue
    // =========================================
    public org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity findLatestByCsrAlias(String csrAlias) {
        return certificateRepository.findAll().stream()
                .filter(c -> csrAlias != null && csrAlias.equalsIgnoreCase(c.getAlias()))
                .reduce((a, b) -> b)
                .orElse(null);
    }

    public void save(org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity cert) {
        certificateRepository.save(cert);
    }}