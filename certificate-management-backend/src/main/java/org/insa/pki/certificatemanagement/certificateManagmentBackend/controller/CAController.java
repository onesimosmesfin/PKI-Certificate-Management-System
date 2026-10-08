package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.annotation.Auditable;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateTreeNode;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RootCARequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.ca.CAService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ca")
public class CAController {

    private final CAService caService;

    public CAController(CAService caService) {
        this.caService = caService;
    }

    // =========================================================
    // ROOT CA (SELF-SIGNED)
    // =========================================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN')")
    @Auditable(action = "ROOT_CA_CREATE", resource = "CA")
    @PostMapping("/root")
    public ResponseEntity<String> createRootCA(
            @RequestBody RootCARequest request
    ) throws Exception {

        String pem = caService.generateRootCA(request);

        return ResponseEntity.ok(pem);
    }

    // =========================================================
    // INTERMEDIATE CA (CSR SIGNING)
    // =========================================================
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN')")
    @Auditable(action = "INTERMEDIATE_CA_SIGN", resource = "CA")
    @PostMapping("/intermediate/sign")
    public ResponseEntity<String> signIntermediateCA(
            @RequestParam Long csrId,
            @RequestParam String caAlias,
            @RequestParam String pin,
            @RequestParam int validityDays
    ) throws Exception {

        String pem = caService.signIntermediateCsr(
                csrId,
                caAlias,
                pin,
                validityDays
        );

        return ResponseEntity.ok(pem);
    }

    // =========================================================
    // CA HIERARCHY
    // =========================================================
    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR','AUDITOR')")
    @GetMapping("/hierarchy")
    public ResponseEntity<List<CertificateTreeNode>> getHierarchy() {

        return ResponseEntity.ok(
                caService.getCAHierarchy()
        );
    }

    // =========================================================
    // GET ALL CA CERTIFICATES
    // =========================================================
    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR','AUDITOR')")
    @GetMapping
    public ResponseEntity<List<?>> getAllCAs() {

        return ResponseEntity.ok(
                caService.getAllCACertificates()
        );
    }

    // =========================================================
    // REVOKE CERTIFICATE
    // =========================================================
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "CERT_REVOKE", resource = "CERTIFICATE")
    @PutMapping("/revoke/{alias}")
    public ResponseEntity<String> revokeCertificate(
            @PathVariable String alias
    ) throws Exception {

        caService.revokeCertificate(alias);

        return ResponseEntity.ok("Certificate revoked successfully");
    }

    // =========================================================
    // DELETE CERTIFICATE
    // =========================================================
    @PreAuthorize("hasRole('ADMIN')")
    @Auditable(action = "CERT_DELETE", resource = "CERTIFICATE")
    @DeleteMapping("/{alias}")
    public ResponseEntity<String> deleteCertificate(
            @PathVariable String alias
    ) throws Exception {

        caService.deleteCertificate(alias);

        return ResponseEntity.ok("Certificate deleted successfully");
    }
}