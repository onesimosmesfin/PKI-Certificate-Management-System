package org.insa.pki.certificatemanagement.certificateManagmentBackend.service.ca;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.*;
import org.bouncycastle.cert.jcajce.*;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.PKCS10CertificationRequest;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.*;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.AuditService;
import org.springframework.stereotype.Service;

import java.io.StringWriter;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.util.*;

@Service
public class CAServiceImpl implements CAService {

    private final KeyRepository keyRepository;
    private final CertificateRepository certificateRepository;
    private final CsrRepository csrRepository;
    private final AuditService auditService;

    public CAServiceImpl(KeyRepository keyRepository,
                         CertificateRepository certificateRepository,
                         CsrRepository csrRepository,
                         AuditService auditService) {
        this.keyRepository = keyRepository;
        this.certificateRepository = certificateRepository;
        this.csrRepository = csrRepository;
        this.auditService = auditService;
    }

    // =========================================================
    // ROOT CA (SELF SIGNED)
    // =========================================================
    @Override
    public String generateRootCA(RootCARequest request) throws Exception {

        // =========================================================
        // LOAD HSM
        // =========================================================

        KeyStore ks = loadHsm(request.getPin());
        // =========================================================
        // VALIDATE KEY EXISTS
        // =========================================================

        KeyEntity key = keyRepository.findByAlias(request.getKeyAlias())
                .orElseThrow(() ->
                        new RuntimeException("Key not found: " + request.getKeyAlias())
                );

        // =========================================================
        // LOAD PRIVATE KEY
        // =========================================================

        PrivateKey privateKey =
                (PrivateKey) ks.getKey(
                        request.getKeyAlias(),
                        null
                );

        if (privateKey == null) {
            throw new RuntimeException(
                    "Unable to access private key from HSM"
            );
        }

        // =========================================================
        // LOAD PUBLIC KEY
        // =========================================================

        X509Certificate keyCert =
                (X509Certificate) ks.getCertificate(
                        request.getKeyAlias()
                );

        if (keyCert == null) {
            throw new RuntimeException(
                    "No certificate attached to HSM key alias"
            );
        }

        PublicKey publicKey = keyCert.getPublicKey();

        // =========================================================
        // SUBJECT
        // =========================================================

        X500Name subject = buildSubject(
                request.getCommonName(),
                request.getOrganization(),
                request.getOrganizationalUnit(),
                request.getCountry()
        );

        // =========================================================
        // BUILD SELF-SIGNED ROOT CERTIFICATE
        // =========================================================

        X509Certificate cert = buildCertificate(
                subject,
                subject,
                publicKey,
                privateKey,
                request.getValidityDays(),
                true,
                request.getPathLength() == null
                        ? 0
                        : request.getPathLength(),
                request.getKeyUsages(),
                request.getExtendedKeyUsages()
        );

        // =========================================================
        // PEM
        // =========================================================

        String pem = toPem(cert);

        // =========================================================
        // UPDATE HSM KEYSTORE WITH THE REAL ROOT CA CERTIFICATE
        // (overwrites the placeholder self-signed cert from key generation)
        // =========================================================
        try {
            ks.setKeyEntry(
                    request.getKeyAlias(),
                    privateKey,
                    null,
                    new java.security.cert.Certificate[]{cert}
            );
            System.out.println("HSM keystore updated with root CA certificate for alias: " + request.getKeyAlias());
        } catch (Exception e) {
            System.err.println("Failed to update HSM keystore with root CA cert: " + e.getMessage());
        }

        // =========================================================
        // HASHES / FINGERPRINTS
        // =========================================================

        String fingerprint = sha256(cert.getEncoded());

        String publicKeyHash =
                sha256(publicKey.getEncoded());

        // =========================================================
        // SAVE CERTIFICATE ENTITY
        // =========================================================

        CertificateEntity entity = new CertificateEntity();

        // BASIC
        entity.setAlias(request.getAlias());

        entity.setKeyAlias(request.getKeyAlias());

        entity.setCertificate(pem);

        entity.setType("ROOT_CA");

        entity.setStatus("ACTIVE");

        // SUBJECT
        entity.setSubject(
                cert.getSubjectX500Principal().getName()
        );
        entity.setIssuer(
                cert.getIssuerX500Principal().getName()
        );

        entity.setCommonName(request.getCommonName());

        entity.setOrganization(request.getOrganization());

        entity.setOrganizationalUnit(
                request.getOrganizationalUnit()
        );

        entity.setCountry(request.getCountry());

        entity.setState(request.getState());

        entity.setLocality(request.getLocality());

        entity.setEmail(request.getEmail());

        // CERT INFO
        entity.setSerialNumber(
                cert.getSerialNumber().toString()
        );

        entity.setIssuerAlias(request.getAlias());

        entity.setSignatureAlgorithm(
                cert.getSigAlgName()
        );

        entity.setCa(true);

        entity.setPathLength(
                request.getPathLength()
        );

        // VALIDITY
        entity.setCreatedAt(LocalDateTime.now());

        entity.setExpiryDate(
                cert.getNotAfter()
                        .toInstant()
                        .atZone(java.time.ZoneId.systemDefault())
                        .toLocalDateTime()
        );

        // SECURITY
        entity.setFingerprint(fingerprint);

        entity.setPublicKeyHash(publicKeyHash);

        entity.setCsrHash(request.getCsrHash());

        // AUDIT
        entity.setCorrelationId(
                request.getCorrelationId()
        );

        entity.setCreatedBy(getUser());

        // EXTENSIONS
        entity.setKeyUsages(
                request.getKeyUsages()
        );

        entity.setExtendedKeyUsages(
                request.getExtendedKeyUsages()
        );

        entity.setDnsNames(
                request.getDnsNames()
        );

        entity.setIpAddresses(
                request.getIpAddresses()
        );

        entity.setCrlUrls(
                request.getCrlUrls()
        );

        // SAVE
        certificateRepository.save(entity);

        // =========================================================
        // AUDIT
        // =========================================================

        audit(
                "ROOT_CA_CREATED",
                request.getAlias()
        );

        return pem;
    }
    private String sha256(byte[] data) throws Exception {

        MessageDigest md =
                MessageDigest.getInstance("SHA-256");

        byte[] digest = md.digest(data);

        StringBuilder sb = new StringBuilder();

        for (byte b : digest) {
            sb.append(String.format("%02x", b));
        }

        return sb.toString();
    }

    @Override
    public String signIntermediateCsr(Long csrId,
                                      String caAlias,
                                      String pin,
                                      int validityDays) throws Exception {

        CsrEntity csrEntity = csrRepository.findById(csrId)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        PKCS10CertificationRequest csr;
        try (org.bouncycastle.util.io.pem.PemReader pemReader = new org.bouncycastle.util.io.pem.PemReader(new java.io.StringReader(csrEntity.getCsrPem()))) {
            org.bouncycastle.util.io.pem.PemObject pemObject = pemReader.readPemObject();
            csr = new PKCS10CertificationRequest(pemObject.getContent());
        }

        KeyStore ks = loadHsm(pin);
        PrivateKey caPrivateKey =
                (PrivateKey) ks.getKey(caAlias, null);

        X509Certificate caCert =
                (X509Certificate) ks.getCertificate(caAlias);

        X500Name issuer = new X500Name(
                caCert.getSubjectX500Principal().getName()
        );

        PublicKey subjectPublicKey =
                new JcaPEMKeyConverter()
                        .setProvider("BC")
                        .getPublicKey(csr.getSubjectPublicKeyInfo());

        X509Certificate cert = buildCertificate(
                csr.getSubject(),
                issuer,
                subjectPublicKey,
                caPrivateKey,
                validityDays,
                false,
                0,
                List.of("digitalSignature"),
                List.of("serverAuth", "clientAuth")
        );

        String pem = toPem(cert);



        CertificateEntity entity = new CertificateEntity();
        entity.setAlias(csrEntity.getCsrAlias());
        entity.setKeyAlias(csrEntity.getKeyAlias());
        entity.setCertificate(pem);
        entity.setType("INTERMEDIATE_CA");
        entity.setIssuerAlias(caAlias);
        entity.setSubject(cert.getSubjectX500Principal().getName());
        entity.setIssuer(
                cert.getIssuerX500Principal().getName()
        );
        entity.setSerialNumber(cert.getSerialNumber().toString());
        entity.setSignatureAlgorithm(cert.getSigAlgName());
        entity.setCa(true);
        entity.setPathLength(0);
        entity.setCreatedAt(LocalDateTime.now());
        entity.setExpiryDate(LocalDateTime.now().plusDays(validityDays));
        entity.setCreatedBy(getUser());

        certificateRepository.save(entity);

        csrEntity.setIssued(true);
        csrEntity.setStatus("SIGNED");
        csrRepository.save(csrEntity);

        audit("INTERMEDIATE_CA_SIGNED", csrEntity.getCsrAlias());

        return pem;
    }


    private X509Certificate buildCertificate(
            X500Name subject,
            X500Name issuer,
            PublicKey pub,
            PrivateKey priv,
            int days,
            boolean isCA,
            int pathLen,
            List<String> keyUsages,
            List<String> ekuList
    ) throws Exception {

        BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());

        Date notBefore = new Date();
        Date notAfter = new Date(System.currentTimeMillis() + days * 86400000L);

        JcaX509v3CertificateBuilder builder =
                new JcaX509v3CertificateBuilder(
                        issuer,
                        serial,
                        notBefore,
                        notAfter,
                        subject,
                        pub
                );

        if (isCA) {
            builder.addExtension(
                    Extension.basicConstraints,
                    true,
                    new BasicConstraints(pathLen)
            );
        } else {
            builder.addExtension(
                    Extension.basicConstraints,
                    true,
                    new BasicConstraints(false)
            );
        }

        builder.addExtension(
                Extension.subjectKeyIdentifier,
                false,
                new JcaX509ExtensionUtils().createSubjectKeyIdentifier(pub)
        );

        builder.addExtension(
                Extension.authorityKeyIdentifier,
                false,
                new JcaX509ExtensionUtils()
                        .createAuthorityKeyIdentifier(
                                SubjectPublicKeyInfo.getInstance(
                                        pub.getEncoded()
                                )
                        )
        );

        if (keyUsages != null) {
            int usage = 0;
            for (String u : keyUsages) {
                switch (u) {
                    case "digitalSignature" -> usage |= KeyUsage.digitalSignature;
                    case "keyEncipherment" -> usage |= KeyUsage.keyEncipherment;
                    case "keyCertSign" -> usage |= KeyUsage.keyCertSign;
                    case "cRLSign" -> usage |= KeyUsage.cRLSign;
                }
            }
            builder.addExtension(Extension.keyUsage, true, new KeyUsage(usage));
        }

        if (ekuList != null && !ekuList.isEmpty()) {
            List<KeyPurposeId> eku = new ArrayList<>();
            for (String e : ekuList) {
                switch (e) {
                    case "serverAuth" -> eku.add(KeyPurposeId.id_kp_serverAuth);
                    case "clientAuth" -> eku.add(KeyPurposeId.id_kp_clientAuth);
                }
            }
            builder.addExtension(
                    Extension.extendedKeyUsage,
                    false,
                    new ExtendedKeyUsage(eku.toArray(new KeyPurposeId[0]))
            );
        }

        ContentSigner signer;

        Provider pkcs11Provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (pkcs11Provider == null) {
            pkcs11Provider = Application.registerSoftHsmProvider();
        }

        byte[] encodedKey = priv.getEncoded();
        if (encodedKey == null || encodedKey.length == 0) {
            signer = createPkcs11ContentSigner(priv, signingAlgorithmFor(priv), pkcs11Provider);
        } else {
            signer = new JcaContentSignerBuilder(signingAlgorithmFor(priv))
                    .setProvider(pkcs11Provider)
                    .build(priv);
        }

        return new JcaX509CertificateConverter()
                .setProvider("BC")
                .getCertificate(builder.build(signer));
    }

    // =========================================================
    // SAVE CERT ENTITY
    // =========================================================
    private void saveCertificate(X509Certificate cert,
                                 RootCARequest request,
                                 String pem,
                                 String type,
                                 String issuerAlias) {

        CertificateEntity entity =
                certificateRepository.findByAlias(request.getAlias())
                        .orElse(new CertificateEntity());

        entity.setAlias(request.getAlias());
        entity.setKeyAlias(request.getKeyAlias());
        entity.setCertificate(pem);
        entity.setType(type);
        entity.setIssuerAlias(issuerAlias);

        entity.setCommonName(request.getCommonName());
        entity.setOrganization(request.getOrganization());
        entity.setOrganizationalUnit(request.getOrganizationalUnit());
        entity.setCountry(request.getCountry());

        entity.setSubject(cert.getSubjectX500Principal().getName());
        entity.setSerialNumber(cert.getSerialNumber().toString());
        entity.setSignatureAlgorithm(cert.getSigAlgName());

        entity.setCa(true);
        entity.setPathLength(request.getPathLength());

        entity.setCreatedAt(LocalDateTime.now());
        entity.setExpiryDate(LocalDateTime.now().plusDays(request.getValidityDays()));
        entity.setCreatedBy(getUser());

        certificateRepository.save(entity);
    }

    private KeyStore loadHsm(String pin) throws Exception {

        try {

            Provider provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (provider == null) {
            provider = Application.registerSoftHsmProvider();
        }

            System.out.println(
                    "PKCS11 Provider Loaded: "
                            + provider.getName()
            );

            KeyStore ks =
                    KeyStore.getInstance("PKCS11", provider);

            // IMPORTANT
            ks.load(null, pin.toCharArray());

            return ks;

        } catch (Exception e) {

            e.printStackTrace();

            throw new RuntimeException(
                    "Failed to load PKCS11 keystore: "
                            + e.getMessage()
            );
        }
    }
    private X500Name buildSubject(String cn, String o, String ou, String c) {
        return new X500Name("CN=" + cn + ", O=" + o + ", OU=" + ou + ", C=" + c);
    }

    private String toPem(X509Certificate cert) throws Exception {
        StringWriter sw = new StringWriter();
        try (org.bouncycastle.openssl.jcajce.JcaPEMWriter w =
                     new org.bouncycastle.openssl.jcajce.JcaPEMWriter(sw)) {
            w.writeObject(cert);
        }
        return sw.toString();
    }

    private void audit(String action, String alias) {
        AuditContext ctx = new AuditContext();
        ctx.setUser(getUser());
        ctx.setAction(action);
        ctx.setTarget(alias);
        ctx.setStatus(AuditStatus.SUCCESS);
        auditService.log(ctx);
    }

    private String getUser() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();
    }

    private ContentSigner createPkcs11ContentSigner(PrivateKey privateKey, String algorithm, Provider provider) throws Exception {
        java.security.Signature signature = java.security.Signature.getInstance(algorithm, provider);
        signature.initSign(privateKey);

        return new ContentSigner() {
            private final org.bouncycastle.asn1.x509.AlgorithmIdentifier algorithmIdentifier =
                    new org.bouncycastle.operator.DefaultSignatureAlgorithmIdentifierFinder().find(algorithm);
            private final java.io.OutputStream outputStream = new java.io.OutputStream() {
                @Override
                public void write(int b) throws java.io.IOException {
                    try {
                        signature.update(new byte[]{(byte) b});
                    } catch (java.security.SignatureException e) {
                        throw new java.io.IOException("Unable to update PKCS#11 signature stream", e);
                    }
                }

                @Override
                public void write(byte[] b, int off, int len) throws java.io.IOException {
                    try {
                        signature.update(b, off, len);
                    } catch (java.security.SignatureException e) {
                        throw new java.io.IOException("Unable to update PKCS#11 signature stream", e);
                    }
                }
            };

            @Override
            public org.bouncycastle.asn1.x509.AlgorithmIdentifier getAlgorithmIdentifier() {
                return algorithmIdentifier;
            }

            @Override
            public java.io.OutputStream getOutputStream() {
                return outputStream;
            }

            @Override
            public byte[] getSignature() {
                try {
                    return signature.sign();
                } catch (java.security.SignatureException e) {
                    throw new IllegalStateException("Failed to sign certificate using HSM private key", e);
                }
            }
        };
    }

    private String signingAlgorithmFor(PrivateKey key) {
        return switch (key.getAlgorithm().toUpperCase(Locale.ROOT)) {
            case "EC", "ECDSA" -> "SHA256withECDSA";
            case "ED25519" -> "Ed25519";
            case "ED448" -> "Ed448";
            default -> "SHA256withRSA";
        };
    }

    @Override
    public List<CertificateTreeNode> getCAHierarchy() {
        List<CertificateEntity> certificates = certificateRepository.findAll();
        Map<String, CertificateTreeNode> nodes = new LinkedHashMap<>();

        for (CertificateEntity certificate : certificates) {
            if (certificate.getAlias() != null && !certificate.getAlias().isBlank()) {
                nodes.put(certificate.getAlias(), new CertificateTreeNode(
                        certificate.getAlias(), certificate.getType(), certificate.getSubject()));
            }
        }

        List<CertificateTreeNode> roots = new ArrayList<>();
        for (CertificateEntity certificate : certificates) {
            CertificateTreeNode node = nodes.get(certificate.getAlias());
            if (node == null) continue;

            CertificateTreeNode issuer = certificate.getIssuerAlias() == null
                    ? null
                    : nodes.get(certificate.getIssuerAlias());
            if (issuer == null || issuer == node) {
                roots.add(node);
            } else {
                issuer.addChild(node);
            }
        }
        return roots;
    }

    @Override
    public List<CertificateEntity> getAllCACertificates() {
        return certificateRepository.findByTypeIn(
                List.of("ROOT_CA", "INTERMEDIATE_CA", "CA"));
    }
    @Override
    public void revokeCertificate(String alias) {
        CertificateEntity certificate = certificateRepository.findByAlias(alias)
                .orElseThrow(() -> new RuntimeException("Certificate not found: " + alias));
        if ("REVOKED".equalsIgnoreCase(certificate.getStatus())) {
            throw new IllegalStateException("Certificate is already revoked");
        }
        certificate.setStatus("REVOKED");
        certificate.setRevokedAt(LocalDateTime.now());
        certificate.setRevokedBy(getUser());
        certificateRepository.save(certificate);
        audit("CA_CERTIFICATE_REVOKED", alias);
    }

    @Override
    public void deleteCertificate(String alias) {
        CertificateEntity certificate = certificateRepository.findByAlias(alias)
                .orElseThrow(() -> new RuntimeException("Certificate not found: " + alias));
        certificateRepository.delete(certificate);
        audit("CA_CERTIFICATE_DELETED", alias);
    }
}
