package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditLog;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.AuditRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.HashUtil;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.SignatureUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;

@Service
public class AuditService {

    private static final Logger log = LoggerFactory.getLogger(AuditService.class);

    private final AuditRepository repo;
    private final SignatureUtil signatureService;
    private final SecurityThreatService threatService;

    public AuditService(AuditRepository repo,
                        SignatureUtil signatureService,
                        SecurityThreatService threatService) {
        this.repo = repo;
        this.signatureService = signatureService;
        this.threatService = threatService;
    }

    public void log(AuditContext ctx) {

        LocalDateTime now = LocalDateTime.now();

        try {

            HttpServletRequest request = getRequestSafely();

            String method = request != null ? request.getMethod() : "UNKNOWN";
            String userAgent = request != null ? request.getHeader("User-Agent") : "UNKNOWN";


            String requestHash = HashUtil.sha256("");
            String responseHash = HashUtil.sha256("");

            AuditLog lastLog = repo.findTopByOrderByIdDesc();
            String previousHash = (lastLog != null) ? lastLog.getCurrentHash() : "GENESIS";

            String combinedData =
                    ctx.getUser() +
                            ctx.getAction() +
                            ctx.getTarget() +
                            ctx.getEndpoint() +
                            ctx.getIp() +
                            requestHash +
                            responseHash +
                            previousHash +
                            now;

            String currentHash = HashUtil.sha256(combinedData);


            String signature = signatureService.sign(currentHash);


            AuditLog logEntry = new AuditLog();

            logEntry.setUsername(ctx.getUser());
            logEntry.setAction(ctx.getAction());
            logEntry.setTarget(ctx.getTarget());
            logEntry.setIp(ctx.getIp());
            logEntry.setEndpoint(ctx.getEndpoint());

            logEntry.setTimestamp(now);

            logEntry.setRequestHash(requestHash);
            logEntry.setResponseHash(responseHash);
            logEntry.setPreviousHash(previousHash);
            logEntry.setCurrentHash(currentHash);

            logEntry.setSignature(signature);
            logEntry.setSignatureAlgorithm("SHA256withRSA");
            logEntry.setSignedBy("SYSTEM");

            logEntry.setCorrelationId(ctx.getCorrelationId());
            logEntry.setStatus(ctx.getStatus());
            logEntry.setDetails(ctx.getDetails());

            logEntry.setMethod(method);
            logEntry.setUserAgent(userAgent);


            if (ctx.getStatus() == org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus.FAILED
                    || ctx.getStatus() == org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus.BLOCKED) {
                try {
                    threatService.analyze(ctx);
                } catch (Exception ex) {
                    log.warn("Threat analysis failed: {}", ex.getMessage());
                }
            }


            repo.save(logEntry);

            log.info("Audit log stored | hash={}", currentHash);

        } catch (Exception e) {

            log.error("Audit logging failed completely", e);
        }
    }


    private HttpServletRequest getRequestSafely() {

        try {
            var attrs = RequestContextHolder.getRequestAttributes();

            if (attrs instanceof ServletRequestAttributes servletAttrs) {
                return servletAttrs.getRequest();
            }

        } catch (Exception ignored) {}

        return null;
    }
}
