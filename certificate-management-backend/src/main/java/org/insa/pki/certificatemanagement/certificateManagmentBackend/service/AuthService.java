package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignupRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.*;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.RefreshTokenRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.TokenBlacklistRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.UserRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.JwtUtil;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

    private final AuthenticationManager authManager;
    private final JwtUtil jwtUtil;
    private final TokenBlacklistRepository blacklistRepo;
    private final RefreshTokenRepository refreshRepo;
    private final UserRepository userRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final RateLimitService rateLimitService;
    private final SecurityThreatService securityThreatService;
    public AuthService(AuthenticationManager authManager,
                       JwtUtil jwtUtil,
                       TokenBlacklistRepository blacklistRepo,
                       RefreshTokenRepository refreshRepo,
                       UserRepository userRepository,
                       AuditService auditService,
                       PasswordEncoder passwordEncoder,
                       RateLimitService rateLimitService,
                       SecurityThreatService securityThreatService) {

        this.authManager = authManager;
        this.jwtUtil = jwtUtil;
        this.blacklistRepo = blacklistRepo;
        this.refreshRepo = refreshRepo;
        this.userRepository = userRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.rateLimitService = rateLimitService;
        this.securityThreatService=securityThreatService;
    }

    private String getClientIp() {
        var request = ((ServletRequestAttributes)
                RequestContextHolder.getRequestAttributes()).getRequest();

        String[] headers = {
                "X-Forwarded-For",
                "X-Real-IP",
                "CF-Connecting-IP",
                "Forwarded"
        };

        for (String header : headers) {
            String value = request.getHeader(header);
            if (value != null && !value.isEmpty() && !"unknown".equalsIgnoreCase(value)) {
                return value.split(",")[0];
            }
        }

        return request.getRemoteAddr();
    }

    public Map<String, String> login(String username, String password) {

        String ip = getClientIp();
        String key = ip + ":" + username;

        try {

            if (!rateLimitService.isAllowed(key)) {

                long sec = rateLimitService.getRemainingBlockSeconds(key);

                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Too many failed login attempts. Try again in " + sec + " seconds"
                );
            }

            authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            UserEntity user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // =========================================
            // UPDATE LAST LOGIN
            // =========================================

            user.setLastLogin(java.time.LocalDateTime.now());

            userRepository.save(user);

            rateLimitService.loginSucceeded(key);
            rateLimitService.loginSucceeded(securityThreatService.buildAuthFailureKey(ip));
            securityThreatService.clearBlock(ip);

            String accessToken = jwtUtil.generateToken(
                    username,
                    user.getRole(),
                    user.getCaType()
            );

            String refreshToken = jwtUtil.generateRefreshToken(username);

            RefreshToken token = new RefreshToken();

            token.setToken(refreshToken);

            token.setUsername(username);

            token.setExpiryDate(
                    Instant.now().plusSeconds(7 * 24 * 3600)
            );

            refreshRepo.save(token);

            return Map.of(
                    "accessToken", accessToken,
                    "refreshToken", refreshToken
            );

        } catch (DisabledException e) {

            securityThreatService.detectFailedLogin(ip, username);

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "User account is disabled"
            );

        } catch (LockedException e) {

            securityThreatService.detectFailedLogin(ip, username);

            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Account pending admin approval"
            );

        } catch (BadCredentialsException | UsernameNotFoundException e) {

            securityThreatService.detectFailedLogin(ip, username);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Invalid username or password"
            );

        } catch (AuthenticationException e) {

            securityThreatService.detectFailedLogin(ip, username);

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Authentication failed"
            );

        } catch (ResponseStatusException e) {

            throw e;

        } catch (Exception e) {

            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Login failed"
            );
        }
    }

    public Map<String, String> signup(SignupRequest req) {

        AuditContext ctx = new AuditContext();

        try {
            ctx.setAction("SIGNUP");
            ctx.setEndpoint("/api/auth/signup");
            ctx.setIp(getClientIp());


            if (!req.getPassword().equals(req.getConfirmPassword())) {
                throw new RuntimeException("Passwords do not match");
            }

            String username = req.getUsername().trim();
            String email = req.getEmail().trim();

            if (userRepository.findByUsername(username).isPresent()) {
                throw new RuntimeException("Username already exists");
            }

            if (req.getRole() == Role.ADMIN) {
                throw new RuntimeException("Admin cannot signup");
            }

            if (req.getRole() == Role.CA_OPERATOR) {
                if (req.getCaType() == null) {
                    throw new RuntimeException("Operator must select CA type");
                }
            } else {
                req.setCaType(null);
            }

            UserEntity user = new UserEntity();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(req.getPassword()));
            user.setRole(req.getRole());
            user.setEnabled(true);

            user.setCaType(req.getCaType());

            boolean isNormalUser = req.getRole() == Role.USER;
            user.setApproved(isNormalUser);

            userRepository.save(user);

            ctx.setUser(user.getUsername());
            ctx.setStatus(AuditStatus.SUCCESS);
            ctx.setDetails("role=" + req.getRole() + ", caType=" + req.getCaType());

            if (isNormalUser) {

                String newAccess = jwtUtil.generateToken(
                        user.getUsername(),
                        user.getRole(),
                        user.getCaType()
                );

                String refreshToken = jwtUtil.generateRefreshToken(user.getUsername());

                RefreshToken token = new RefreshToken();
                token.setToken(refreshToken);
                token.setUsername(user.getUsername());
                token.setExpiryDate(Instant.now().plusSeconds(7 * 24 * 3600));

                refreshRepo.save(token);

                return Map.of(
                        "accessToken", newAccess,
                        "refreshToken", refreshToken
                );
            }

            return Map.of("message", "Awaiting admin approval");

        } catch (Exception e) {
            ctx.setUser(req.getUsername());
            ctx.setStatus(AuditStatus.FAILED);
            ctx.setDetails(e.getMessage());
            throw e;

        } finally {
            auditService.log(ctx);
        }
    }

    public List<UserEntity> getPendingUsers() {

        return userRepository.findAll()
                .stream()
                .filter(user ->
                        !user.isApproved()
                                && user.getRole() != Role.ADMIN
                )
                .toList();
    }

    public void logout(String token) {

        String jti = jwtUtil.extractClaims(token).getId();
        long expiry = jwtUtil.extractClaims(token)
                .getExpiration().getTime();

        if (blacklistRepo.findByToken(jti).isPresent()) return;

        TokenBlacklist blacklist = new TokenBlacklist();
        blacklist.setToken(jti);
        blacklist.setExpiry(expiry);

        blacklistRepo.save(blacklist);
    }


    public void approveUser(Long userId, String adminUsername) {

        AuditContext ctx = new AuditContext();

        try {
            ctx.setAction("APPROVE_USER");
            ctx.setUser(adminUsername);
            ctx.setEndpoint("/api/admin/approve");

            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            ctx.setTarget(user.getUsername());


            if (user.isApproved()) {
                throw new RuntimeException("User already approved");
            }

            if (user.getRole() == Role.ADMIN) {
                throw new RuntimeException("Cannot approve admin user");
            }

            user.setApproved(true);
            user.setEnabled(true);
            userRepository.save(user);

            ctx.setStatus(AuditStatus.SUCCESS);

        } catch (Exception e) {
            ctx.setStatus(AuditStatus.FAILED);
            ctx.setDetails(e.getMessage());
            throw e;

        } finally {
            auditService.log(ctx);
        }
    }

    public Map<String, String> refresh(String refreshToken) {

        RefreshToken token = refreshRepo.findByToken(refreshToken)
                .orElseThrow(() -> new RuntimeException("Invalid refresh token"));

        if (token.getExpiryDate().isBefore(Instant.now())) {
            throw new RuntimeException("Expired refresh token");
        }

        refreshRepo.delete(token);

        UserEntity user = userRepository.findByUsername(token.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String newAccess = jwtUtil.generateToken(
                user.getUsername(),
                user.getRole(),
                user.getCaType()
        );
        String newRefresh = jwtUtil.generateRefreshToken(user.getUsername());

        RefreshToken newToken = new RefreshToken();
        newToken.setToken(newRefresh);
        newToken.setUsername(user.getUsername());
        newToken.setExpiryDate(Instant.now().plusSeconds(7 * 24 * 3600));

        refreshRepo.save(newToken);

        return Map.of(
                "accessToken", newAccess,
                "refreshToken", newRefresh
        );
    }

    public void rejectUser(Long userId, String adminUsername) {

        AuditContext ctx = new AuditContext();

        try {
            ctx.setAction("REJECT_USER");
            ctx.setUser(adminUsername);
            ctx.setEndpoint("/api/admin/reject");

            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            ctx.setTarget(user.getUsername());

            if (user.isApproved()) {
                throw new RuntimeException("Cannot reject already approved user");
            }

            if (user.getRole() == Role.ADMIN) {
                throw new RuntimeException("Cannot reject admin user");
            }

            userRepository.delete(user);

            ctx.setStatus(AuditStatus.SUCCESS);

        } catch (Exception e) {
            ctx.setStatus(AuditStatus.FAILED);
            ctx.setDetails(e.getMessage());
            throw e;

        } finally {
            auditService.log(ctx);
        }
    }
}
