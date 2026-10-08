package org.insa.pki.certificatemanagement.certificateManagmentBackend.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CaType;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.Role;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtUtil {

    private final String SECRET =
            "my-super-secure-secret-key-change-this-in-prod-env-must-be-longer";

    private final long ACCESS_EXPIRATION = 1000 * 60 * 60;
    private final long REFRESH_EXPIRATION = 7L * 24 * 60 * 60 * 1000;

    private Key getSignKey() {
        return Keys.hmacShaKeyFor(SECRET.getBytes());
    }

    // =========================================================
    // ACCESS TOKEN
    // =========================================================
    public String generateToken(
            String username,
            Role role,
            CaType caType
    ) {

        return Jwts.builder()
                .setSubject(username)

                // ROLE
                .claim("role", role.name())

                // CA TYPE
                .claim(
                        "caType",
                        caType != null ? caType.name() : null
                )

                // TOKEN ID
                .setId(UUID.randomUUID().toString())

                .setIssuer("PKI-System")
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(
                                System.currentTimeMillis()
                                        + ACCESS_EXPIRATION
                        )
                )

                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================
    public String generateRefreshToken(String username) {

        return Jwts.builder()
                .setSubject(username)

                .setId(UUID.randomUUID().toString())

                .setIssuer("PKI-System-Refresh")
                .setIssuedAt(new Date())
                .setExpiration(
                        new Date(
                                System.currentTimeMillis()
                                        + REFRESH_EXPIRATION
                        )
                )

                .signWith(getSignKey(), SignatureAlgorithm.HS256)
                .compact();
    }

    // =========================================================
    // EXTRACT CLAIMS
    // =========================================================
    public Claims extractClaims(String token) {

        return Jwts.parserBuilder()
                .setSigningKey(getSignKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    // =========================================================
    // EXTRACT USERNAME
    // =========================================================
    public String extractUsername(String token) {
        return extractClaims(token).getSubject();
    }

    // =========================================================
    // EXTRACT ROLE
    // =========================================================
    public String extractRole(String token) {
        return extractClaims(token)
                .get("role", String.class);
    }

    // =========================================================
    // EXTRACT CA TYPE
    // =========================================================
    public String extractCaType(String token) {
        return extractClaims(token)
                .get("caType", String.class);
    }

    // =========================================================
    // EXTRACT JTI
    // =========================================================
    public String extractJti(String token) {
        return extractClaims(token).getId();
    }

    // =========================================================
    // VALIDATE TOKEN
    // =========================================================
    public boolean isValid(String token) {

        try {
            extractClaims(token);
            return true;

        } catch (ExpiredJwtException e) {
            return false;

        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    // =========================================================
    // CHECK EXPIRATION
    // =========================================================
    public boolean isExpired(String token) {

        try {
            Date expiration = extractClaims(token)
                    .getExpiration();

            return expiration.before(new Date());

        } catch (Exception e) {
            return true;
        }
    }
}