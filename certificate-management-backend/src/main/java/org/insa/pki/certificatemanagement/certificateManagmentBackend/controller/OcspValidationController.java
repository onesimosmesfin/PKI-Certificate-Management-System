package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.OcspValidationRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.OcspValidationResponse;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.OcspValidationService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ocsp")
public class OcspValidationController {

    private final OcspValidationService ocspService;

    public OcspValidationController(OcspValidationService ocspService) {
        this.ocspService = ocspService;
    }


    @PreAuthorize("hasAnyRole('ADMIN','CA_OPERATOR')")
    @PostMapping("/validate")
    public OcspValidationResponse validate(
            @RequestBody OcspValidationRequest request
    ) throws Exception {

        String currentUser = SecurityContextHolder
                .getContext()
                .getAuthentication()
                .getName();

        return ocspService.validateCertificateByAlias(
                request.getCertificateAlias(),
                request.getIssuerAlias(),
                currentUser
        );
    }
}
