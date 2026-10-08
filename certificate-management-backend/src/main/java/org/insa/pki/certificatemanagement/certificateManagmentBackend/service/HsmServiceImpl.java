package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import jakarta.servlet.http.HttpServletRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.asn1.x509.AlgorithmIdentifier;
import org.bouncycastle.cert.*;
import org.bouncycastle.cert.jcajce.*;
import org.bouncycastle.operator.*;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.AuditContext;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.KeyRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.AuditStatus;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.KeyRepository;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigInteger;
import java.security.*;
import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.security.spec.ECGenParameterSpec;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Set;

@Service
public class HsmServiceImpl implements HsmService {

    private final KeyRepository keyRepository;
    private final AuditService auditService;
    private final SecurityThreatService threatService;

    private static final Set<String> ALLOWED_ALGOS = Set.of("RSA", "EC", "EDDSA", "ED25519", "ED448");

    private static final Set<String> RSA_SIGNING_ALGOS = Set.of(
            "SHA256withRSA",
            "SHA384withRSA",
            "SHA512withRSA",
            "SHA256withRSAandMGF1",
            "SHA384withRSAandMGF1",
            "SHA512withRSAandMGF1"
    );

    private static final Set<String> EC_SIGNING_ALGOS = Set.of(
            "SHA256withECDSA",
            "SHA384withECDSA",
            "SHA512withECDSA"
    );

    private static final Set<String> EDDSA_SIGNING_ALGOS = Set.of(
            "Ed25519",
            "Ed448"
    );
public HsmServiceImpl(KeyRepository keyRepository,
                          AuditService auditService,
                          SecurityThreatService threatService) {
        this.keyRepository = keyRepository;
        this.auditService = auditService;
        this.threatService = threatService;
    }

    private String getCurrentUsername() {
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext()
                .getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            return "SYSTEM";
        }

        return auth.getName();
    }

    @Override
    public String generateKey(KeyRequest request) {

        AuditContext ctx = new AuditContext();

        try {
            System.out.println("ÃƒÂ°Ã…Â¸Ã¢â‚¬ÂÃ‚Â Starting key generation...");

            if (request == null) {
                throw new IllegalArgumentException("Request body is null");
            }

            if (request.getAlgorithm() == null) {
                throw new IllegalArgumentException("Algorithm is required");
            }

            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

            if (attrs == null) {
                throw new IllegalStateException("No HTTP request context available");
            }

            HttpServletRequest http = attrs.getRequest();

            String username = (http.getUserPrincipal() != null)
                    ? http.getUserPrincipal().getName()
                    : "UNKNOWN";

            ctx.setUser(username);
            ctx.setAction("GENERATE_KEY");
            ctx.setEndpoint("/api/hsm/generate");
            ctx.setIp(http.getRemoteAddr());

            validate(request);

            if (keyRepository.findByAlias(request.getAlias()).isPresent()) {
                throw new RuntimeException("Alias already exists");
            }

            // Use the canonical provider registered by Application
            Provider provider = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
            if (provider == null) {
                provider = Application.registerSoftHsmProvider();
            }

            String algo = request.getAlgorithm().toUpperCase();
            boolean isEdDsa = "EDDSA".equals(algo) || "ED25519".equals(algo) || "ED448".equals(algo);

            KeyStore ks = null;
            if (!isEdDsa) {
                ks = KeyStore.getInstance("PKCS11", provider);
                ks.load(null, request.getPassword().toCharArray());
            }


            KeyPairGenerator kpg;

            if ("RSA".equals(algo)) {
                kpg = KeyPairGenerator.getInstance("RSA", provider);
                kpg.initialize(request.getKeySize());
            } else if ("EC".equals(algo)) {
                kpg = KeyPairGenerator.getInstance("EC", provider);
                kpg.initialize(new ECGenParameterSpec(request.getCurveName()));
            } else if ("EDDSA".equals(algo) || "ED25519".equals(algo) || "ED448".equals(algo)) {
                // EdDSA is not supported by SoftHSM 2.5 – fall back to Bouncy Castle software
                System.out.println("Generating EdDSA key in software (BC): " + algo);
                kpg = KeyPairGenerator.getInstance(
                        "ED25519".equals(algo) || "Ed25519".equals(algo) ? "Ed25519" : "Ed448",
                        "BC"
                );
            } else {
                throw new IllegalArgumentException("Unsupported algorithm: " + algo);
            }

            KeyPair kp = kpg.generateKeyPair();

            // PKCS#11 keys must be backed by a certificate chain when stored in the
            // provider keystore. A self-signed certificate keeps the private key valid
            // for later lookup while avoiding the "Private key must be accompanied by
            // certificate chain" failure that was blocking the whole CA flow.
            if (ks != null) {
                X500Name subject = new X500Name("CN=" + request.getAlias());
                Date notBefore = new Date();
                Date notAfter = new Date(System.currentTimeMillis() + 3650L * 24 * 60 * 60 * 1000);
                BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());

                String certSigningAlgo = resolveSigningAlgorithm(request, algo);
                ContentSigner signer = createPkcs11ContentSigner(kp.getPrivate(), certSigningAlgo, provider);

                X509Certificate selfSignedCert = new JcaX509CertificateConverter()
                        .setProvider("BC")
                        .getCertificate(
                                new JcaX509v3CertificateBuilder(
                                        subject,
                                        serial,
                                        notBefore,
                                        notAfter,
                                        subject,
                                        kp.getPublic()
                                ).build(signer)
                        );

                ks.setKeyEntry(
                        request.getAlias(),
                        kp.getPrivate(),
                        request.getPassword().toCharArray(),
                        new Certificate[]{selfSignedCert}
                );
            }

            KeyEntity entity = new KeyEntity();
            entity.setAlias(request.getAlias());
            entity.setAlgorithm(algo);
            entity.setKeySize(request.getKeySize());
            entity.setCurveName(request.getCurveName());
            entity.setPublicKey(Base64.getEncoder().encodeToString(kp.getPublic().getEncoded()));
            entity.setIsHsmKey(!isEdDsa);
            entity.setHsmLabel(isEdDsa ? null : request.getAlias());
            if (isEdDsa) {
                entity.setPrivateKey(java.util.Base64.getEncoder().encodeToString(kp.getPrivate().getEncoded()));
            }
            entity.setCreatedBy(getCurrentUsername());
            entity.setCreatedAt(LocalDateTime.now());

            keyRepository.save(entity);

            ctx.setTarget(request.getAlias());
            ctx.setStatus(AuditStatus.SUCCESS);

            System.out.println("ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦ Key generated successfully: " + request.getAlias());

            return "Key successfully generated: " + request.getAlias();

        } catch (Exception e) {

            ctx.setStatus(AuditStatus.FAILED);
            ctx.setDetails(e.getMessage());

            e.printStackTrace();

            throw new RuntimeException("HSM Key generation failed: " + e.getMessage(), e);

        } finally {
            auditService.log(ctx);
            threatService.analyze(ctx);
        }
    }

    private ContentSigner createPkcs11ContentSigner(PrivateKey privateKey, String algorithm, Provider provider) throws Exception {
        java.security.Signature signature = java.security.Signature.getInstance(algorithm, provider);
        signature.initSign(privateKey);

        return new ContentSigner() {
            private final AlgorithmIdentifier algorithmIdentifier =
                    new DefaultSignatureAlgorithmIdentifierFinder().find(algorithm);
            private final OutputStream outputStream = new OutputStream() {
                @Override
                public void write(int b) throws IOException {
                    try {
                        signature.update(new byte[]{(byte) b});
                    } catch (SignatureException e) {
                        throw new IOException("Unable to update PKCS#11 signature stream", e);
                    }
                }

                @Override
                public void write(byte[] b, int off, int len) throws IOException {
                    try {
                        signature.update(b, off, len);
                    } catch (SignatureException e) {
                        throw new IOException("Unable to update PKCS#11 signature stream", e);
                    }
                }
            };

            @Override
            public AlgorithmIdentifier getAlgorithmIdentifier() {
                return algorithmIdentifier;
            }

            @Override
            public OutputStream getOutputStream() {
                return outputStream;
            }

            @Override
            public byte[] getSignature() {
                try {
                    return signature.sign();
                } catch (SignatureException e) {
                    throw new IllegalStateException("Failed to sign certificate using HSM private key", e);
                }
            }
        };
    }

    private String resolveSigningAlgorithm(KeyRequest request, String algo) {

        String signingAlgo = request.getSigningAlgorithm();

        if (signingAlgo == null || signingAlgo.isBlank()) {
            if ("RSA".equals(algo)) return "SHA256withRSA";
        if ("EC".equals(algo)) return "SHA256withECDSA";
        return "Ed25519";
        }

        signingAlgo = signingAlgo.trim();

        if ("RSA".equals(algo) && !RSA_SIGNING_ALGOS.contains(signingAlgo)) {
            throw new IllegalArgumentException("Invalid RSA signing algorithm");
        }

        if ("EC".equals(algo) && !EC_SIGNING_ALGOS.contains(signingAlgo)) {
            throw new IllegalArgumentException("Invalid EC signing algorithm");
        }

        if (("EDDSA".equals(algo) || "ED25519".equals(algo) || "ED448".equals(algo))
                && !EDDSA_SIGNING_ALGOS.contains(signingAlgo)) {
            throw new IllegalArgumentException("Invalid EdDSA signing algorithm");
        }

        return signingAlgo;
    }

    private void validate(KeyRequest request) {

        if (request.getAlias() == null || request.getAlias().isBlank()) {
            throw new IllegalArgumentException("Alias is required");
        }

        if (request.getPassword() == null || request.getPassword().length() < 4) {
            throw new IllegalArgumentException("PIN must be at least 4 characters");
        }

        String algo = request.getAlgorithm().toUpperCase();

            boolean isEdDsa = "EDDSA".equals(algo) || "ED25519".equals(algo) || "ED448".equals(algo);

        if (!ALLOWED_ALGOS.contains(algo)) {
            throw new IllegalArgumentException("Only RSA and EC supported");
        }

        if (algo.equals("RSA") && request.getKeySize() < 2048) {
            throw new IllegalArgumentException("RSA must be >= 2048");
        }

        if (algo.equals("EC")) {
            if (request.getCurveName() == null || request.getCurveName().isBlank()) {
                throw new IllegalArgumentException("Curve name required");
            }
            Set<String> allowedCurves = Set.of("secp256r1", "secp384r1", "secp521r1");
            if (!allowedCurves.contains(request.getCurveName())) {
                throw new IllegalArgumentException("Allowed EC curves: secp256r1, secp384r1, secp521r1");
            }
        }
    }

    @Override
    public List<KeyEntity> getMyKeys() {
        String username = getCurrentUsername();
        return keyRepository.findByCreatedBy(username);
    }

    @Override
    public java.util.List<org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity> getAllKeys() {
        return keyRepository.findAll();
    }
}