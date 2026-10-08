package org.insa.pki.certificatemanagement.certificateManagmentBackend.config;

import jakarta.annotation.PostConstruct;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.CorrelationFilter;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.JwtFilter;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.security.RateLimitFilter;
import org.springframework.http.HttpMethod;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.expression.WebExpressionAuthorizationManager;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.security.Security;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class WebSecurityConfig {

    private final JwtFilter jwtFilter;
    private final CorrelationFilter correlationFilter;
    private final RateLimitFilter rateLimitFilter;

    public WebSecurityConfig(JwtFilter jwtFilter,
                             CorrelationFilter correlationFilter,
                             RateLimitFilter rateLimitFilter) {
        this.jwtFilter = jwtFilter;
        this.correlationFilter = correlationFilter;
        this.rateLimitFilter = rateLimitFilter;
    }

    @PostConstruct
    public void init() {
        Security.addProvider(new BouncyCastleProvider());
        System.out.println("✅ Bouncy Castle Provider Added");
    }


    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration config = new CorsConfiguration();

        config.setAllowCredentials(true);
        config.setAllowedOriginPatterns(List.of("http://localhost:*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setExposedHeaders(List.of("Authorization"));

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }


    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())

                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/**")
                        .access(new WebExpressionAuthorizationManager(
                                "isAuthenticated() and !hasRole('AUDITOR')"
                        ))
                        .requestMatchers(HttpMethod.PUT, "/api/**")
                        .access(new WebExpressionAuthorizationManager(
                                "isAuthenticated() and !hasRole('AUDITOR')"
                        ))
                        .requestMatchers(HttpMethod.PATCH, "/api/**")
                        .access(new WebExpressionAuthorizationManager(
                                "isAuthenticated() and !hasRole('AUDITOR')"
                        ))
                        .requestMatchers(HttpMethod.DELETE, "/api/**")
                        .access(new WebExpressionAuthorizationManager(
                                "isAuthenticated() and !hasRole('AUDITOR')"
                        ))

                        .requestMatchers("/api/admin/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )

                .addFilterBefore(correlationFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
