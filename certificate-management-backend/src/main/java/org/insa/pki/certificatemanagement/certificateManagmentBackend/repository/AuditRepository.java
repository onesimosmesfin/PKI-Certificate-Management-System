package org.insa.pki.certificatemanagement.certificateManagmentBackend.repository;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditRepository extends
        JpaRepository<AuditLog, Long>,
        JpaSpecificationExecutor<AuditLog> {

    AuditLog findTopByOrderByIdDesc();

    List<AuditLog> findByCorrelationIdOrderByTimestampAsc(String correlationId);

    long countByStatus(AuditStatus status);

    long countByActionAndTimestampAfter(
            String action,
            LocalDateTime timestamp
    );

    List<AuditLog> findTop20BySeverityOrderByTimestampDesc(
            org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditSeverity severity
    );
}