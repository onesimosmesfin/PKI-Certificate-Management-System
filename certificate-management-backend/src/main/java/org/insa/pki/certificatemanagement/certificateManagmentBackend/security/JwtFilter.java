package org.insa.pki.certificatemanagement.certificateManagmentBackend.security;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.TokenBlacklistRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.SecurityThreatService;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
public class JwtFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final TokenBlacklistRepository blacklistRepo;
    private final SecurityThreatService threatService;

    public JwtFilter(JwtUtil jwtUtil,
                     TokenBlacklistRepository blacklistRepo,
                     SecurityThreatService threatService) {
        this.jwtUtil = jwtUtil;
        this.blacklistRepo = blacklistRepo;
        this.threatService = threatService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {

        String ip = extractClientIp(request);
        String path = request.getRequestURI();
        String correlationId = (String) request.getAttribute("correlationId");

        if (isPublicEndpoint(path)) {
            chain.doFilter(request, response);
            return;
        }

        if (threatService.isBlocked(ip)) {
            sendForbidden(response, "IP blocked due to suspicious activity");
            return;
        }

        String header = request.getHeader("Authorization");


        if (header == null || !header.startsWith("Bearer ")) {

            threatService.analyze(buildContext(request, "MISSING_TOKEN", correlationId));

            sendUnauthorized(response, "Missing token");
            return;
        }

        String token = header.substring(7);

        try {
            String tokenId = jwtUtil.extractJti(token);


            if (blacklistRepo.findByToken(tokenId).isPresent()) {

                threatService.analyze(buildContext(request, "BLACKLISTED_TOKEN", correlationId));

                sendUnauthorized(response, "Token revoked");
                return;
            }


            if (!jwtUtil.isValid(token)) {

                threatService.analyze(buildContext(request, "INVALID_TOKEN", correlationId));

                sendUnauthorized(response, "Invalid or expired token");
                return;
            }


            String username = jwtUtil.extractUsername(token);
            String role = jwtUtil.extractRole(token);

            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            username,
                            null,
                            List.of(new SimpleGrantedAuthority("ROLE_" + role))
                    );

            SecurityContextHolder.getContext().setAuthentication(auth);

            chain.doFilter(request, response);

        }  catch (Exception e) {

        e.printStackTrace();

        threatService.analyze(buildContext(request, "AUTH_ERROR", correlationId));

        sendUnauthorized(response, "Authentication error: " + e.getMessage());
    }
    }


    private boolean isPublicEndpoint(String path) {
        return path.startsWith("/api/auth/")
                || path.startsWith("/swagger")
                || path.startsWith("/v3/api-docs");
    }


    private String extractClientIp(HttpServletRequest request) {

        String xfHeader = request.getHeader("X-Forwarded-For");

        if (xfHeader != null && !xfHeader.isBlank()) {
            return xfHeader.split(",")[0].trim();
        }

        return request.getRemoteAddr();
    }

    private AuditContext buildContext(HttpServletRequest request,
                                      String action,
                                      String correlationId) {

        AuditContext ctx = new AuditContext();
        ctx.setUser("UNKNOWN");
        ctx.setAction(action);
        ctx.setIp(extractClientIp(request));
        ctx.setEndpoint(request.getRequestURI());
        ctx.setStatus(AuditStatus.FAILED);
        ctx.setCorrelationId(correlationId);

        return ctx;
    }

    // =========================
    // ❌ 401 RESPONSE
    // =========================
    private void sendUnauthorized(HttpServletResponse response,
                                  String message) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");

        response.getWriter().write("""
        {
          "error": "UNAUTHORIZED",
          "message": "%s"
        }
        """.formatted(message));
    }

    // =========================
    // ⛔ 403 RESPONSE
    // =========================
    private void sendForbidden(HttpServletResponse response,
                               String message) throws IOException {

        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json");

        response.getWriter().write("""
        {
          "error": "FORBIDDEN",
          "message": "%s"
        }
        """.formatted(message));
    }
}
