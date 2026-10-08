package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditLogResponseDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditStatsDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.AuditMapper;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditSeverity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.springframework.data.domain.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditRepository auditRepository;

    public AuditController(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    // =========================
    // LOGS (DTO + PAGINATION)
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','AUDITOR')")
    @GetMapping("/logs")
    public Page<AuditLogResponseDTO> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size
    ) {

        Page<AuditLog> logs = auditRepository.findAll(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "timestamp"))
        );

        return logs.map(AuditMapper::toDTO);
    }

    // =========================
    // STATS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','AUDITOR')")
    @GetMapping("/stats")
    public AuditStatsDTO getStats() {

        AuditStatsDTO dto = new AuditStatsDTO();

        dto.setTotalEvents(auditRepository.count());

        dto.setFailedActions(
                auditRepository.countByStatus(AuditStatus.FAILED)
        );

        dto.setRevocationsToday(
                auditRepository.countByActionAndTimestampAfter(
                        "CERT_REVOKE",
                        LocalDateTime.now().minusDays(1)
                )
        );

        dto.setCrlGenerated(
                auditRepository.countByActionAndTimestampAfter(
                        "CRL_GENERATE",
                        LocalDateTime.now().minusDays(1)
                )
        );

        return dto;
    }

    // =========================
    // CORRELATION TRACE
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','AUDITOR')")
    @GetMapping("/correlation/{id}")
    public List<AuditLogResponseDTO> getCorrelationTrace(@PathVariable String id) {

        return auditRepository
                .findByCorrelationIdOrderByTimestampAsc(id)
                .stream()
                .map(AuditMapper::toDTO)
                .toList();
    }

    // =========================
    // HIGH RISK EVENTS
    // =========================

    @PreAuthorize("hasAnyRole('ADMIN','AUDITOR')")
    @GetMapping("/high-risk")
    public List<AuditLogResponseDTO> getHighRiskEvents() {

        return auditRepository
                .findTop20BySeverityOrderByTimestampDesc(AuditSeverity.CRITICAL)
                .stream()
                .map(AuditMapper::toDTO)
                .toList();
    }
}