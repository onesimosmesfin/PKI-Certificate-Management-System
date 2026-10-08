package org.insa.pki.certificatemanagement.certificateManagmentBackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.security.Provider;
import java.security.Security;

@EnableScheduling
@SpringBootApplication
public class Application {

    public static final String SOFTHSM_PROVIDER_NAME = "SoftHSM";
    public static final String SOFTHSM_PROVIDER_LOOKUP_NAME = "SunPKCS11-SoftHSM";
    private static final String SOFTHSM_LIBRARY = "C:/SoftHSM2/lib/softhsm2-x64.dll";
    private static final long SOFTHSM_SLOT = 191083967L;

    public static void main(String[] args) {
        try {
            System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
            Provider provider = registerSoftHsmProvider();
            if (provider != null) {
                System.out.println("SoftHSM provider ready: " + provider.getName());
            }
        } catch (Exception e) {
            System.err.println("HSM initialization failed: " + e.getMessage());
            // DO NOT rethrow — let Spring Boot start anyway
        }

        SpringApplication.run(Application.class, args);
    }

    /**
     * Idempotent registration:
     * - If the provider is already registered under LOOKUP name, return it.
     * - If it's registered under the config name, return it.
     * - Otherwise, attempt to register once.
     */
    public static Provider registerSoftHsmProvider() {
        // 1. Check for already-registered provider (any known name)
        Provider existing = Security.getProvider(SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (existing == null) {
            existing = Security.getProvider(SOFTHSM_PROVIDER_NAME);
        }
        if (existing != null) {
            System.out.println("[HSM] Provider already registered: " + existing.getName());
            return existing;
        }

        // 2. First-time registration
        Provider base = Security.getProvider("SunPKCS11");
        if (base == null) {
            throw new IllegalStateException("SunPKCS11 provider not available");
        }

        String config =
                "--name=" + SOFTHSM_PROVIDER_NAME + "\n" +
                "library=" + SOFTHSM_LIBRARY + "\n" +
                "slot=" + SOFTHSM_SLOT;

        try {
            Provider provider = base.configure(config);
            Security.addProvider(provider);
            System.out.println("[HSM] Provider registered successfully: " + provider.getName());
            return provider;
        } catch (Exception e) {
            System.err.println("[HSM] Failed to register provider: " + e.getMessage());
            return null;   // caller decides what to do
        }
    }
}