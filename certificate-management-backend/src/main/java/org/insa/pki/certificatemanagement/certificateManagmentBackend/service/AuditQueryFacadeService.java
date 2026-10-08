package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditFilterRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;

@Service
public class AuditQueryFacadeService {

    private final AuditRepository repo;

    public AuditQueryFacadeService(AuditRepository repo) {
        this.repo = repo;
    }

    public Page<AuditLog> search(AuditFilterRequest req, int page, int size) {

        return repo.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"))
        );
    }
}