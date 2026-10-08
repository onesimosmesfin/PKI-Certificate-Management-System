package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import jakarta.servlet.http.HttpServletResponse;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditFilterRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.AuditExportService;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.AuditPdfExportService;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.PrintWriter;

@RestController
@RequestMapping("/api/audit/export")
public class AuditExportController {

    private final AuditExportService csvService;
    private final AuditPdfExportService pdfService;
    private final AuditRepository auditRepository;

    public AuditExportController(AuditExportService csvService,
                                 AuditPdfExportService pdfService,AuditRepository auditRepository) {
        this.csvService = csvService;
        this.pdfService = pdfService;
        this.auditRepository=auditRepository;
    }



    @PostMapping("/csv/stream")
    public void streamCsv(HttpServletResponse response,
                          @RequestBody AuditFilterRequest req) throws Exception {

        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=audit-stream.csv");

        PrintWriter writer = response.getWriter();
        writer.println("id,username,action,ip,status,timestamp");

        auditRepository.findAll(Sort.by(Sort.Direction.DESC, "timestamp"))
                .forEach(log -> {
                    writer.printf("%d,%s,%s,%s,%s,%s%n",
                            log.getId(),
                            log.getUsername(),
                            log.getAction(),
                            log.getIp(),
                            log.getStatus(),
                            log.getTimestamp()
                    );
                    writer.flush();
                });
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportPdf() {

        byte[] data = pdfService.exportPdf();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=audit-log.pdf")
                .header(HttpHeaders.CONTENT_TYPE,
                        MediaType.APPLICATION_PDF_VALUE)
                .body(data);
    }

    @PostMapping("/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestBody AuditFilterRequest req
    ) {

        byte[] data = csvService.exportCsv(req);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=audit.csv")
                .header(HttpHeaders.CONTENT_TYPE,
                        "text/csv")
                .body(data);
    }
}