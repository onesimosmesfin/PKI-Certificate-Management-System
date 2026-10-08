package org.insa.pki.certificatemanagement.certificateManagmentBackend.config;


import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditLogResponseDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;

public class AuditMapper {

    public static AuditLogResponseDTO toDTO(AuditLog log) {

        AuditLogResponseDTO dto = new AuditLogResponseDTO();

        dto.setId(log.getId());
        dto.setUsername(log.getUsername());
        dto.setAction(log.getAction());
        dto.setTarget(log.getTarget());
        dto.setStatus(log.getStatus());
        dto.setSeverity(log.getSeverity());
        dto.setEventType(log.getEventType());
        dto.setIp(log.getIp());
        dto.setEndpoint(log.getEndpoint());
        dto.setCorrelationId(log.getCorrelationId());
        dto.setDetails(log.getDetails());
        dto.setTimestamp(log.getTimestamp());

        // SIEM enrichment fields
        dto.setExecutionTimeMs(null); // optional future enhancement
        dto.setIntegrityVerified(true); // will be computed later

        return dto;
    }
}
