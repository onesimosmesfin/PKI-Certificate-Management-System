package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.CRLReason;
import org.bouncycastle.cert.X509CRLHolder;
import org.bouncycastle.cert.X509v2CRLBuilder;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RevokedCertificateDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigInteger;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Provider;
import java.security.Security;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.List;

@Service
public class CRLServiceImpl implements CRLService {

    private final CertificateRepository certificateRepository;
    private final RevokedCertificateRepository revokedRepository;
    private final CRLRepository crlRepository;
    private final AuditService auditService;

    public CRLServiceImpl(CertificateRepository certificateRepository,
                          RevokedCertificateRepository revokedRepository,
                          CRLRepository crlRepository,
                          AuditService auditService) {
        this.certificateRepository = certificateRepository;
        this.revokedRepository = revokedRepository;
        this.crlRepository = crlRepository;
        this.auditService = auditService;
    }


    @Override
    public byte[] getLatestCRL(String caAlias) {

        CRLEntryEntity entity = crlRepository
                .findTopByCaAliasOrderByGeneratedAtDesc(caAlias)
                .orElseThrow(() -> new RuntimeException("CRL not found"));

        return entity.getCrlData();
    }

    @Override
    public List<RevokedCertificateDTO> getRevokedCertificates() {

        return revokedRepository.findAll()
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    private RevokedCertificateDTO mapToDTO(
            RevokedCertificate revoked
    ) {

        RevokedCertificateDTO dto =
                new RevokedCertificateDTO();

        dto.setId(revoked.getId());

        dto.setSerialNumber(
                revoked.getSerialNumber()
        );

        dto.setCertificateAlias(
                revoked.getCertificateAlias()
        );

        dto.setIssuerAlias(
                revoked.getIssuerAlias()
        );

        // FIXED
        if (revoked.getRevocationDate() != null) {

            dto.setRevocationDate(
                    revoked.getRevocationDate()
                            .toInstant()
                            .atZone(java.time.ZoneId.systemDefault())
                            .toLocalDateTime()
            );
        }

        dto.setReason(
                revoked.getReason() != null
                        ? revoked.getReason().name()
                        : "UNSPECIFIED"
        );

        dto.setStatus("REVOKED");

        try {

            CertificateEntity cert =
                    certificateRepository
                            .findByAlias(
                                    revoked.getCertificateAlias()
                            )
                            .orElse(null);

            if (cert != null) {
                dto.setCommonName(cert.getCommonName());
            }

        } catch (Exception ignored) {}

        return dto;
    }
    @Override
    public List<RevokedCertificateDTO> getMyRevokedCertificates() {

        String currentUser = getCurrentUser();

        return revokedRepository
                .findByRevokedBy(currentUser)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }
    @Override
    public byte[] generateCRL(String caAlias, String pin) throws Exception {

        String correlationId = caAlias + "-" + System.currentTimeMillis();

        try {

            // Use the canonical provider registered by Application
            Provider provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (provider == null) {
            provider = Application.registerSoftHsmProvider();
        }

            KeyStore ks = KeyStore.getInstance("PKCS11", provider);
            ks.load(null, pin.toCharArray());

            PrivateKey caPrivateKey =
                    (PrivateKey) ks.getKey(
                            caAlias,
                            pin.toCharArray()
                    );            X509Certificate caCert = (X509Certificate) ks.getCertificate(caAlias);

            if (caPrivateKey == null || caCert == null) {
                throw new RuntimeException("CA not found in HSM");
            }

            CertificateEntity entity = certificateRepository.findByAlias(caAlias)
                    .orElseThrow(() -> new RuntimeException("CA metadata not found"));

            if (!"ACTIVE".equalsIgnoreCase(entity.getStatus())) {
                throw new RuntimeException("CA is not active");
            }

            X500Name issuer = new X500Name(
                    caCert.getSubjectX500Principal().getName()
            );

            Date now = new Date();
            Date nextUpdate = new Date(now.getTime() + 7L * 24 * 60 * 60 * 1000);

            X509v2CRLBuilder builder = new X509v2CRLBuilder(issuer, now);
            builder.setNextUpdate(nextUpdate);

            List<RevokedCertificate> revokedList =
                    revokedRepository.findByIssuerAlias(caAlias);

            for (RevokedCertificate r : revokedList) {

                if (r.getSerialNumber() == null || r.getRevocationDate() == null)
                    continue;

                builder.addCRLEntry(
                        new BigInteger(r.getSerialNumber()),
                        r.getRevocationDate(),
                        mapReason(r.getReason())
                );
            }

            ContentSigner signer = new JcaContentSignerBuilder(
                    getSignatureAlgorithm(caPrivateKey)
            ).setProvider(provider).build(caPrivateKey);

            X509CRLHolder crlHolder = builder.build(signer);
            byte[] crlBytes = crlHolder.getEncoded();

            CRLEntryEntity crlEntity = new CRLEntryEntity();
            crlEntity.setCaAlias(caAlias);
            crlEntity.setCrlData(crlBytes);
            crlEntity.setGeneratedAt(new Date());
            crlEntity.setGeneratedBy(getCurrentUser());
            crlEntity.setCorrelationId(correlationId);

            crlRepository.save(crlEntity);

            AuditContext ctx = new AuditContext();
            ctx.setUser(getCurrentUser());
            ctx.setAction("CRL_GENERATED");
            ctx.setTarget(caAlias);
            ctx.setEndpoint("/api/crl/generate");
            ctx.setStatus(AuditStatus.SUCCESS);
            ctx.setCorrelationId(correlationId);

            auditService.log(ctx);

            return crlBytes;

        } catch (Exception ex) {

            AuditContext ctx = new AuditContext();
            ctx.setUser(getCurrentUser());
            ctx.setAction("CRL_GENERATED");
            ctx.setTarget(caAlias);
            ctx.setEndpoint("/api/crl/generate");
            ctx.setStatus(AuditStatus.FAILED);            ctx.setCorrelationId(correlationId);

            auditService.log(ctx);

            throw ex;
        }
    }


    private int mapReason(RevocationReason reason) {

        if (reason == null) return CRLReason.unspecified;

        return switch (reason) {
            case KEY_COMPROMISE -> CRLReason.keyCompromise;
            case CA_COMPROMISE -> CRLReason.cACompromise;
            case AFFILIATION_CHANGED -> CRLReason.affiliationChanged;
            case SUPERSEDED -> CRLReason.superseded;
            case CESSATION_OF_OPERATION -> CRLReason.cessationOfOperation;
            case CERTIFICATE_HOLD -> CRLReason.certificateHold;
            default -> CRLReason.unspecified;
        };
    }

    private String getSignatureAlgorithm(PrivateKey key) {
        return switch (key.getAlgorithm().toUpperCase()) {
            case "RSA" -> "SHA256withRSA";
            case "EC" -> "SHA256withECDSA";
            default -> throw new RuntimeException("Unsupported algorithm");
        };
    }

    private String getCurrentUser() {
        return SecurityContextHolder.getContext()
                .getAuthentication()
                .getName();
    }
}