package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.bouncycastle.asn1.pkcs.PKCSObjectIdentifiers;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.*;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.bouncycastle.pkcs.jcajce.JcaPKCS10CertificationRequestBuilder;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrResponse;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CsrEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.CsrRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.KeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;

import java.io.StringWriter;
import java.security.*;
import java.security.KeyStore;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Date;
import java.util.List;

@Service
public class CsrServiceImpl implements CsrService {

    @Autowired
    private CertificateServiceImpl certificateService;

    private final KeyRepository keyRepository;
    private final CsrRepository csrRepository;
    private final AuditService auditService;

    public CsrServiceImpl(KeyRepository keyRepository,
                          CsrRepository csrRepository,
                          AuditService auditService) {
        this.keyRepository = keyRepository;
        this.csrRepository = csrRepository;
        this.auditService = auditService;
    }

    // =========================
    // GENERATE CSR + SAVE DB
    // =========================
    @Override
    public CsrResponse generateCsr(CsrRequest request) throws Exception {

        if (request == null) {
            throw new IllegalArgumentException("CSR request is required");
        }
        if (request.getAlias() == null || request.getAlias().isBlank()) {
            throw new IllegalArgumentException("A key alias is required");
        }
        if (request.getCsrAlias() == null || request.getCsrAlias().isBlank()) {
            throw new IllegalArgumentException("A CSR alias is required");
        }
        if (request.getCommonName() == null || request.getCommonName().isBlank()) {
            throw new IllegalArgumentException("Common Name is required");
        }
        if (request.getPin() == null || request.getPin().isBlank()) {
            throw new IllegalArgumentException("HSM PIN is required");
        }

        KeyEntity key = keyRepository.findByAlias(request.getAlias())
                .orElseThrow(() -> new RuntimeException("Key not found"));

        if (!Boolean.TRUE.equals(key.getIsHsmKey())) {
            throw new RuntimeException("CSR allowed ONLY for HSM keys");
        }

        if (!getCurrentUsername().equals(key.getCreatedBy())) {
            throw new RuntimeException("You can only generate a CSR with your own key");
        }

        // Register on demand as well as at application startup.  This keeps CSR
        // generation working after a delayed HSM startup or a DevTools restart.
        Provider provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (provider == null) {
            provider = Application.registerSoftHsmProvider();
        }
        if (provider == null) {
            throw new IllegalStateException("SoftHSM provider could not be initialized");
        }

        KeyStore ks = KeyStore.getInstance("PKCS11", provider);
        ks.load(null, request.getPin().toCharArray());

        PrivateKey privateKey =
                (PrivateKey) ks.getKey(request.getAlias(), request.getPin().toCharArray());

        Certificate cert = ks.getCertificate(request.getAlias());
        if (privateKey == null) {
            throw new RuntimeException(
                    "The key alias was not found in the selected HSM token. Verify the HSM PIN and alias.");
        }

        PublicKey publicKey = (cert != null)
                ? cert.getPublicKey()
                : getPublicKeyFromStoredKey(key);

        if (publicKey == null) {
            throw new RuntimeException(
                    "Could not resolve the public key for the selected HSM alias.");
        }

        // =========================
        // BUILD DN
        // =========================
        StringBuilder dn = new StringBuilder();

        if (request.getCommonName() != null)
            dn.append("CN=").append(request.getCommonName()).append(",");

        if (request.getOrganization() != null)
            dn.append("O=").append(request.getOrganization()).append(",");

        if (request.getOrganizationalUnit() != null)
            dn.append("OU=").append(request.getOrganizationalUnit()).append(",");

        if (request.getCountry() != null)
            dn.append("C=").append(request.getCountry()).append(",");

        if (request.getState() != null)
            dn.append("ST=").append(request.getState()).append(",");

        if (request.getLocality() != null)
            dn.append("L=").append(request.getLocality()).append(",");

        if (request.getEmail() != null)
            dn.append("EMAILADDRESS=").append(request.getEmail()).append(",");

        String dnStr = dn.toString();
        if (dnStr.endsWith(",")) {
            dnStr = dnStr.substring(0, dnStr.length() - 1);
        }

        X500Name subject = new X500Name(dnStr);

        JcaPKCS10CertificationRequestBuilder builder =
                new JcaPKCS10CertificationRequestBuilder(subject, publicKey);

        // =========================
        // EXTENSIONS
        // =========================
        ExtensionsGenerator extGen = new ExtensionsGenerator();

        // Basic Constraints
        extGen.addExtension(
                Extension.basicConstraints,
                true,
                new BasicConstraints(request.isCa())
        );

        // Key Usage
        int usage = 0;
        if (request.getKeyUsages() != null) {
            for (String u : request.getKeyUsages()) {
                switch (u) {
                    case "digitalSignature" -> usage |= KeyUsage.digitalSignature;
                    case "nonRepudiation" -> usage |= KeyUsage.nonRepudiation;
                    case "keyEncipherment" -> usage |= KeyUsage.keyEncipherment;
                    case "dataEncipherment" -> usage |= KeyUsage.dataEncipherment;
                    case "keyAgreement" -> usage |= KeyUsage.keyAgreement;
                    case "keyCertSign" -> usage |= KeyUsage.keyCertSign;
                    case "cRLSign" -> usage |= KeyUsage.cRLSign;
                }
            }
        }

        extGen.addExtension(
                Extension.keyUsage,
                true,
                new KeyUsage(usage)
        );

        // SAN
        List<GeneralName> sanList = new ArrayList<>();

        if (request.getDnsNames() != null) {
            for (String dns : request.getDnsNames()) {
                sanList.add(new GeneralName(GeneralName.dNSName, dns));
            }
        }

        if (request.getIpAddresses() != null) {
            for (String ip : request.getIpAddresses()) {
                sanList.add(new GeneralName(GeneralName.iPAddress, ip));
            }
        }

        if (!sanList.isEmpty()) {
            extGen.addExtension(
                    Extension.subjectAlternativeName,
                    false,
                    new GeneralNames(sanList.toArray(new GeneralName[0]))
            );
        }

        builder.addAttribute(
                PKCSObjectIdentifiers.pkcs_9_at_extensionRequest,
                extGen.generate()
        );

        // =========================
        // SIGN CSR
        // =========================
        ContentSigner signer =
                new JcaContentSignerBuilder(request.getSignatureAlgorithm())
                        .setProvider(provider)
                        .build(privateKey);

        var csr = builder.build(signer);

        String pem = convertToPem(csr);

        CsrEntity entity = new CsrEntity();

        entity.setCsrAlias(request.getCsrAlias());
        entity.setKeyAlias(request.getAlias());

        entity.setCsrPem(pem);

// SUBJECT
        entity.setCommonName(request.getCommonName());
        entity.setOrganization(request.getOrganization());
        entity.setOrganizationalUnit(request.getOrganizationalUnit());
        entity.setCountry(request.getCountry());
        entity.setState(request.getState());
        entity.setLocality(request.getLocality());
        entity.setEmail(request.getEmail());

// SIGNING
        entity.setSignatureAlgorithm(request.getSignatureAlgorithm());

// VALIDITY
        entity.setNotBefore(request.getNotBefore());
        entity.setNotAfter(request.getNotAfter());

// BASIC CONSTRAINTS
        entity.setCa(request.isCa());
        entity.setPathLength(request.getPathLength());

// IDENTIFIERS
        entity.setSubjectKeyIdentifier(
                request.isSubjectKeyIdentifier());

        entity.setAuthorityKeyIdentifier(
                request.isAuthorityKeyIdentifier());

// AIA
        entity.setOcspUrl(request.getOcspUrl());
        entity.setCaIssuersUrl(request.getCaIssuersUrl());

// COLLECTIONS
        entity.setKeyUsages(request.getKeyUsages());
        entity.setExtendedKeyUsages(
                request.getExtendedKeyUsages());

        entity.setDnsNames(request.getDnsNames());
        entity.setIpAddresses(request.getIpAddresses());

        entity.setCrlUrls(request.getCrlUrls());

// STATUS
        entity.setStatus("PENDING");

        entity.setExpired(false);
        entity.setIssued(false);

// AUDIT
        entity.setCreatedAt(LocalDateTime.now());

        entity.setCreatedBy(getCurrentUsername());

        csrRepository.save(entity);

        auditService.log(audit("CSR_GENERATED", request.getAlias(), "SUCCESS"));

        return new CsrResponse(pem);
    }

    // =========================
    // LIST CSR (USER BASED)
    // =========================
    @Override
    public List<CsrEntity> getMyCsrs() {
        return csrRepository.findByCreatedBy(getCurrentUsername());
    }
    @Override
    public List<CsrEntity> getAllCsrs() {
        return csrRepository.findAll();
    }
    // =========================
    // DELETE CSR
    // =========================
    @Override
    public void deleteCsr(Long id) {

        CsrEntity csr = csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        boolean isOperatorOrAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().startsWith("ROLE_CA_OPERATOR") ||
                               a.getAuthority().startsWith("ROLE_ADMIN") ||
                               a.getAuthority().startsWith("ROLE_ROOT") ||
                               a.getAuthority().startsWith("ROLE_INTERMEDIATE") ||
                               a.getAuthority().contains("OPERATOR"));

        if (!isOperatorOrAdmin && !csr.getCreatedBy().equals(getCurrentUsername())) {
            throw new RuntimeException("Unauthorized");
        }

        csrRepository.delete(csr);

        auditService.log(audit("CSR_DELETED", csr.getCsrAlias(), "SUCCESS"));
    }

    // =========================
    // REVOKE CSR
    // =========================
    @Override
    public void revokeCsr(Long id, String reason) {

        CsrEntity csr = csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        csr.setStatus("REVOKED");
        csrRepository.save(csr);

        auditService.log(audit("CSR_REVOKED", csr.getCsrAlias(), "SUCCESS"));
    }

    // =========================
    // APPROVE CSR
    // =========================
    @Override
    public void approveCsr(Long id) {

        CsrEntity csr = csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        if ("REVOKED".equalsIgnoreCase(csr.getStatus())) {
            throw new RuntimeException("Cannot approve a revoked CSR");
        }

        csr.setStatus("APPROVED");
        csrRepository.save(csr);

        auditService.log(audit("CSR_APPROVED", csr.getCsrAlias(), "SUCCESS"));
    }

    // =========================================
    // APPROVE CSR AND ISSUE CERTIFICATE
    // =========================================
    @Override
    public org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity approveAndIssue(
            Long id,
            org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request) throws Exception {

        CsrEntity csr = csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        if ("REVOKED".equalsIgnoreCase(csr.getStatus())) {
            throw new RuntimeException("Cannot approve a revoked CSR");
        }
        if (Boolean.TRUE.equals(csr.getIssued()) || "SIGNED".equalsIgnoreCase(csr.getStatus())) {
            throw new RuntimeException("This CSR has already been issued");
        }

        // 1) Mark CSR approved
        csr.setStatus("APPROVED");
        csrRepository.save(csr);
        auditService.log(audit("CSR_APPROVED", csr.getCsrAlias(), "SUCCESS"));

        // 2) Issue certificate via existing signing flow
        org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignCsrRequest signReq =
                new org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignCsrRequest();
        signReq.setCsrId(csr.getId());
        signReq.setCaAlias(request.getCaAlias() != null && !request.getCaAlias().isBlank()
                ? request.getCaAlias() : "root-ca-key-2026");
        signReq.setPin(request.getPin() != null && !request.getPin().isBlank()
                ? request.getPin() : "12345678");
        signReq.setValidityDays(request.getValidityDays() > 0 ? request.getValidityDays() : 365);

        certificateService.signCsr(signReq);

        // 3) Reload the freshly issued certificate
        org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity issued =
                certificateService.findLatestByCsrAlias(csr.getCsrAlias());

        // 4) Preserve the original CSR creator so the user sees the cert in /my-certificates
        if (issued != null && csr.getCreatedBy() != null) {
            issued.setCreatedBy(csr.getCreatedBy());
            certificateService.save(issued);
        }

        return issued;
    }

    // =========================
    // EXPORT CSR
    // =========================
    @Override
    public byte[] exportCsr(Long id) {

        CsrEntity csr = csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));

        org.springframework.security.core.Authentication auth =
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();

        boolean isOperatorOrAdmin = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().startsWith("ROLE_CA_OPERATOR") ||
                               a.getAuthority().startsWith("ROLE_ADMIN") ||
                               a.getAuthority().startsWith("ROLE_ROOT") ||
                               a.getAuthority().startsWith("ROLE_INTERMEDIATE") ||
                               a.getAuthority().contains("OPERATOR"));

        if (!isOperatorOrAdmin && !csr.getCreatedBy().equals(getCurrentUsername())) {
            throw new RuntimeException("Unauthorized");
        }

        auditService.log(audit("CSR_EXPORTED", csr.getCsrAlias(), "SUCCESS"));

        return csr.getCsrPem().getBytes();
    }

    // =========================
    // UTIL
    // =========================
    private String convertToPem(Object obj) throws Exception {
        StringWriter sw = new StringWriter();
        try (JcaPEMWriter pw = new JcaPEMWriter(sw)) {
            pw.writeObject(obj);
        }
        return sw.toString();
    }

    private PublicKey getPublicKeyFromStoredKey(KeyEntity key) throws Exception {
        if (key == null || key.getPublicKey() == null || key.getPublicKey().isBlank()) {
            return null;
        }

        byte[] encoded = Base64.getDecoder().decode(key.getPublicKey());
        String algorithm = key.getAlgorithm();
        String keyFactoryAlgorithm = switch (algorithm) {
            case "RSA" -> "RSA";
            case "EC" -> "EC";
            case "EDDSA", "ED25519" -> "Ed25519";
            case "ED448" -> "Ed448";
            default -> algorithm;
        };

        return KeyFactory.getInstance(keyFactoryAlgorithm)
                .generatePublic(new java.security.spec.X509EncodedKeySpec(encoded));
    }
    @Override
    public CsrEntity getCsrById(Long id) {
        return csrRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("CSR not found"));
    }
    @Override
    public CsrEntity importCsr(String alias, String pem) {

        CsrEntity entity = new CsrEntity();

        entity.setCsrAlias(alias);
        entity.setCsrPem(pem);

        entity.setStatus("IMPORTED");
        entity.setCreatedAt(LocalDateTime.now());
        entity.setCreatedBy(getCurrentUsername());

        return csrRepository.save(entity);
    }
    private String getCurrentUsername() {
        return org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();
    }

    private AuditContext audit(String action, String target, String status) {
        AuditContext ctx = new AuditContext();
        ctx.setUser(getCurrentUsername());
        ctx.setAction(action);
        ctx.setTarget(target);
        ctx.setStatus(AuditStatus.SUCCESS);
        ctx.setEndpoint("/api/csr");
        return ctx;
    }
}
