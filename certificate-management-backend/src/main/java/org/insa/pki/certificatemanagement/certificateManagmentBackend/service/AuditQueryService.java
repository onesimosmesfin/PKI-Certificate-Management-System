package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditFilterRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.AuditSpecification;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
public class AuditQueryService {

    private AuditRepository repo;

    public AuditQueryService(AuditRepository repo) {
        this.repo = repo;
    }

    public Page<AuditLog> filter(AuditFilterRequest req) {

        Pageable pageable = PageRequest.of(
                req.getPage(),
                req.getSize(),
                Sort.by(
                        Sort.Direction.fromString(req.getDirection()),
                        req.getSortBy()
                )
        );

        return repo.findAll(
                AuditSpecification.filter(req),
                pageable
        );
    }

    public AuditRepository getRepo() {
        return repo;
    }

    public void setRepo(AuditRepository repo) {
        this.repo = repo;
    }
}