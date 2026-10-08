package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.util.List;

@Service
public class AuditPdfExportService {

    private final AuditRepository auditRepository;

    public AuditPdfExportService(AuditRepository auditRepository) {
        this.auditRepository = auditRepository;
    }

    public byte[] exportPdf() {

        try {

            List<AuditLog> logs = auditRepository.findAll(
                    Sort.by(Sort.Direction.DESC, "timestamp")
            );

            ByteArrayOutputStream out = new ByteArrayOutputStream();

            PdfWriter writer = new PdfWriter(out);
            PdfDocument pdf = new PdfDocument(writer);

            Document document = new Document(pdf);

            document.add(new Paragraph("AUDIT LOG REPORT"));
            document.add(new Paragraph("===================================="));

            for (AuditLog log : logs) {

                String row =
                        "ID: " + log.getId()
                                + " | USER: " + log.getUsername()
                                + " | ACTION: " + log.getAction()
                                + " | TARGET: " + log.getTarget()
                                + " | STATUS: " + log.getStatus()
                                + " | TIME: " + log.getTimestamp();

                document.add(new Paragraph(row));
            }

            document.close();

            return out.toByteArray();

        } catch (Exception e) {
            e.printStackTrace();
            return new byte[0];
        }
    }
}