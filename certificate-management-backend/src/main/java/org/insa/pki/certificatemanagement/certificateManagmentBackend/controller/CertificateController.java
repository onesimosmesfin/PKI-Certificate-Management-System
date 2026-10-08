package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.annotation.Auditable;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignCsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.CertificateService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/certificates")
public class CertificateController {

    private final CertificateService certificateService;

    public CertificateController(
            CertificateService certificateService
    ) {
        this.certificateService = certificateService;
    }

    // =========================================
    // SIGN CSR
    // =========================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN')")
    @PostMapping("/sign")
    @Auditable(action = "CSR_SIGN")
    public String signCsr(
            @RequestBody SignCsrRequest request
    ) throws Exception {

        return certificateService.signCsr(request);
    }

    // =========================================
    // CA LIST
    // =========================================
    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR','USER','AUDITOR')")
    @GetMapping("/ca-list")
    public List<CertificateEntity> getCaCertificates() {

        return certificateService.getCaCertificates();
    }

    // =========================================
    // MY CERTIFICATES
    // =========================================
    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR','USER','AUDITOR')")
    @GetMapping("/my-certificates")
    public List<CertificateEntity> getMyCertificates() {

        return certificateService.getMyCertificates();
    }

    // =========================================
    // GET CERTIFICATE DETAILS
    // =========================================
    @GetMapping("/{id}")
    public ResponseEntity<CertificateDTO> getCertificate(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                certificateService.getCertificateById(id)
        );
    }

    // =========================================
    // DOWNLOAD PEM
    // =========================================
    @GetMapping("/{id}/pem")
    public ResponseEntity<String> downloadPem(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                certificateService.downloadPem(id)
        );
    }

    // =========================================
    // VERIFY CERTIFICATE
    // =========================================
    @GetMapping("/{id}/verify")
    public ResponseEntity<Boolean> verify(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                certificateService.verifyCertificate(id)
        );
    }

    // =========================================
    // REVOKE CERTIFICATE
    // =========================================
    @PostMapping("/{id}/revoke")
    public ResponseEntity<String> revoke(
            @PathVariable Long id,
            @RequestParam String reason
    ) {

        certificateService.revokeCertificate(id, reason);

        return ResponseEntity.ok("Certificate revoked");
    }

    // =========================================
    // IMPORT CERTIFICATE (PEM)
    // =========================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','USER')")
    @PostMapping("/import")
    @Auditable(action = "CERT_IMPORT")
    public String importCertificate(
            @RequestBody org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateImportRequest request
    ) throws Exception {
        return certificateService.importCertificate(request);
    }

    // =========================================
    // EXPORT CERTIFICATE AS DER
    // =========================================
    @GetMapping("/{id}/der")
    public ResponseEntity<byte[]> downloadDer(
            @PathVariable Long id
    ) {
        byte[] der = certificateService.downloadDer(id);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"cert-" + id + ".der\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(der);
    }

    // =========================================
    // EXPORT CERTIFICATE AS PFX
    // =========================================
    @GetMapping("/{id}/pfx")
    public ResponseEntity<byte[]> downloadPfx(
            @PathVariable Long id,
            @RequestParam(defaultValue = "changeit") String password
    ) throws Exception {
        byte[] pfx = certificateService.downloadPfx(id, password);
        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"cert-" + id + ".pfx\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(pfx);
    }

    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR','USER')")
    @PostMapping("/{id}/renew")
    @Auditable(action = "CERT_RENEW")
    public String renew(
            @PathVariable Long id,
            @RequestBody org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request
    ) throws Exception {
        return certificateService.renewCertificate(id, request);
    }

    // =========================================
    // ALL CERTIFICATES (for CA_OPERATOR and ADMIN)
    // =========================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','INTERMEDIATE_OPERATOR','OPERATOR_INTERMEDIATE','INTERMEDIATE','OPERATOR_ROOT','ROOT')")
    @GetMapping("/all-certificates")
    public List<CertificateEntity> getAllCertificates() {
        return certificateService.getAllCertificates();
    }

    // =========================================
    // DELETE CERTIFICATE
    // =========================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','INTERMEDIATE_OPERATOR','OPERATOR_INTERMEDIATE','INTERMEDIATE','OPERATOR_ROOT','ROOT')")
    @DeleteMapping("/{id}")
    @Auditable(action = "CERT_DELETE")
    public ResponseEntity<String> deleteCertificate(
            @PathVariable Long id
    ) {
        certificateService.deleteCertificate(id);
        return ResponseEntity.ok("Certificate deleted successfully");
    }
}