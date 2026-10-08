package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.OcspValidationResponse;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.RevokedCertificate;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.CertificateRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.RevokedCertificateRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.CertificateUtils;
import org.springframework.stereotype.Service;

import java.security.cert.X509Certificate;
import java.time.LocalDateTime;

@Service
public class OcspValidationService {

    private final CertificateRepository certificateRepository;
    private final RevokedCertificateRepository revokedRepository;
    private final AuditService auditService;

    public OcspValidationService(CertificateRepository certificateRepository,
                                 RevokedCertificateRepository revokedRepository,
                                 AuditService auditService) {
        this.certificateRepository = certificateRepository;
        this.revokedRepository = revokedRepository;
        this.auditService = auditService;
    }

    public OcspValidationResponse validateCertificateByAlias(
            String certAlias,
            String issuerAlias,
            String actor
    ) throws Exception {

        String correlationId = "OCSP-" + System.currentTimeMillis();

        try {


            CertificateEntity certEntity = certificateRepository.findByAlias(certAlias)
                    .orElseThrow(() -> new RuntimeException("Certificate not found"));

            CertificateEntity issuerEntity = certificateRepository.findByAlias(issuerAlias)
                    .orElseThrow(() -> new RuntimeException("Issuer not found"));

            X509Certificate cert = CertificateUtils.parse(certEntity.getCertificate());
            X509Certificate issuer = CertificateUtils.parse(issuerEntity.getCertificate());


            boolean revoked = revokedRepository
                    .findByCertificateAlias(certAlias)
                    .isPresent();

            String status;

            if (revoked || "REVOKED".equalsIgnoreCase(certEntity.getStatus())) {
                status = "REVOKED";

            } else if (certEntity.getExpiryDate() != null &&
                    certEntity.getExpiryDate().isBefore(LocalDateTime.now())) {
                status = "EXPIRED";

            } else {
                status = "GOOD";
            }


            String ocspUrl = extractOcspUrl(cert);


            AuditContext audit = new AuditContext();
            audit.setUser(actor);
            audit.setAction("OCSP_VALIDATION");
            audit.setTarget(certAlias);
            audit.setEndpoint("/api/ocsp/validate");
            audit.setStatus(AuditStatus.SUCCESS);
            audit.setCorrelationId(correlationId);

            auditService.log(audit);

            return new OcspValidationResponse(
                    status,
                    ocspUrl != null ? ocspUrl : "N/A"
            );

        } catch (Exception ex) {

            AuditContext audit = new AuditContext();
            audit.setUser(actor);
            audit.setAction("OCSP_VALIDATION");
            audit.setTarget(certAlias);
            audit.setEndpoint("/api/ocsp/validate");
            audit.setStatus(AuditStatus.FAILED);
            audit.setCorrelationId(correlationId);
            audit.setDetails(ex.getMessage());

            auditService.log(audit);

            throw ex;
        }
    }


    private String extractOcspUrl(X509Certificate cert) throws Exception {

        byte[] aiaExt = cert.getExtensionValue(
                org.bouncycastle.asn1.x509.Extension.authorityInfoAccess.getId()
        );

        if (aiaExt == null) return null;

        byte[] octets = org.bouncycastle.asn1.ASN1OctetString
                .getInstance(aiaExt)
                .getOctets();

        org.bouncycastle.asn1.x509.AuthorityInformationAccess aia =
                org.bouncycastle.asn1.x509.AuthorityInformationAccess.getInstance(octets);

        for (org.bouncycastle.asn1.x509.AccessDescription ad : aia.getAccessDescriptions()) {

            if (ad.getAccessMethod()
                    .equals(org.bouncycastle.asn1.x509.AccessDescription.id_ad_ocsp)) {

                return ad.getAccessLocation().getName().toString();
            }
        }

        return null;
    }
}