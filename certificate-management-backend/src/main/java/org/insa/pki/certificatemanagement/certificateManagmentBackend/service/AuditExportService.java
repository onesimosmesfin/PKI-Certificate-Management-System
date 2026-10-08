package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.apache.el.stream.Stream;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditFilterRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.PrintWriter;
import java.util.List;

@Service
public class AuditExportService {

    private final AuditRepository auditRepository;
    private final AuditQueryService queryService;

    public AuditExportService(AuditRepository auditRepository,AuditQueryService queryService) {
        this.auditRepository = auditRepository;
        this.queryService=queryService;
    }

    public byte[] exportCsv(AuditFilterRequest req) {

        List<AuditLog> logs = auditRepository.findAll();

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PrintWriter writer = new PrintWriter(out);

        writer.println("id,username,action,target,ip,status,timestamp");

        for (AuditLog log : logs) {

            writer.printf(
                    "%d,%s,%s,%s,%s,%s,%s%n",
                    log.getId(),
                    safe(log.getUsername()),
                    safe(log.getAction()),
                    safe(log.getTarget()),
                    safe(log.getIp()),
                    String.valueOf(log.getStatus()),
                    String.valueOf(log.getTimestamp())
            );
        }

        writer.flush();
        writer.close();

        return out.toByteArray();
    }

    private String safe(String value) {
        return value == null ? "" : value.replace(",", " ");
    }
}