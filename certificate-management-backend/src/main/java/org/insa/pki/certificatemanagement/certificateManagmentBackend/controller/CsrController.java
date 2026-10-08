package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.annotation.Auditable;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrResponse;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CsrEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.CsrService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/csr")
public class CsrController {

    private final CsrService csrService;

    public CsrController(CsrService csrService) {
        this.csrService = csrService;
    }


    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN')")
    @PostMapping("/generate")
    @Auditable(action = "CSR_GENERATE")
    public CsrResponse generateCsr(@RequestBody CsrRequest request) throws Exception {
        return csrService.generateCsr(request);
    }
    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','USER','AUDITOR')")
    @GetMapping("/list")
    public List<CsrEntity> getAllCsrs() {
        return csrService.getAllCsrs();
    }
    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN','AUDITOR')")
    @GetMapping("/my")
    public List<CsrEntity> getMyCsr() {
        return csrService.getMyCsrs();
    }


    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN','AUDITOR')")
    @GetMapping("/{id}")
    public CsrEntity getCsrById(@PathVariable Long id) {
        return csrService.getCsrById(id);
    }


    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN','AUDITOR')")
    @GetMapping("/export/{id}")
    @Auditable(action = "CSR_EXPORT")
    public byte[] exportCsr(@PathVariable Long id) {
        return csrService.exportCsr(id);
    }


    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','INTERMEDIATE_OPERATOR','OPERATOR_INTERMEDIATE','INTERMEDIATE','OPERATOR_ROOT','ROOT')")
    @DeleteMapping("/{id}")
    @Auditable(action = "CSR_DELETE")
    public String deleteCsr(@PathVariable Long id) {
        csrService.deleteCsr(id);
        return "CSR deleted successfully";
    }

    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','INTERMEDIATE_OPERATOR','OPERATOR_INTERMEDIATE','INTERMEDIATE','OPERATOR_ROOT','ROOT')")
    @PostMapping("/{id}/revoke")
    @Auditable(action = "CSR_REVOKE")
    public String revokeCsr(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "KEY_COMPROMISE") String reason
    ) {
        csrService.revokeCsr(id, reason);
        return "CSR revoked successfully";
    }

    @PreAuthorize("hasAnyRole('CA_OPERATOR','ADMIN','INTERMEDIATE_OPERATOR','OPERATOR_INTERMEDIATE','INTERMEDIATE','OPERATOR_ROOT','ROOT')")
    @PostMapping("/{id}/approve")
    @Auditable(action = "CSR_APPROVE")
    public String approveCsr(@PathVariable Long id) {
        csrService.approveCsr(id);
        return "CSR approved successfully";
    }

    @PostMapping("/{id}/approve-and-issue")
    @Auditable(action = "CSR_APPROVE_AND_ISSUE")
    public org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity approveAndIssue(
            @PathVariable Long id,
            @RequestBody org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request
    ) throws Exception {
        return csrService.approveAndIssue(id, request);
    }


    @PreAuthorize("hasAnyRole('CA_OPERATOR','USER','ADMIN')")
    @PostMapping("/import")
    @Auditable(action = "CSR_IMPORT")
    public CsrEntity importCsr(
            @RequestParam String alias,
            @RequestBody String pem
    ) {
        return csrService.importCsr(alias, pem);
    }
}
