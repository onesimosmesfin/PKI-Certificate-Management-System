import java.security.KeyStore;
import java.security.Provider;
import java.security.Security;

public class Pkcs11Test {

    public static void main(String[] args) {

        System.out.println("Java: " + System.getProperty("java.version"));
        System.out.println("SOFTHSM2_CONF: " + System.getenv("SOFTHSM2_CONF"));

        Provider base = Security.getProvider("SunPKCS11");

        if (base == null) {
            System.out.println("ERROR: SunPKCS11 provider not available");
            return;
        }

        String config =
                "--name=SunPKCS11-SoftHSM\n" +
                "library=C:/SoftHSM2/lib/softhsm2-x64.dll\n" +
                "slotListIndex=0";

        try {

            Provider provider = base.configure(config);

            System.out.println("Provider configured successfully.");
            System.out.println("Provider name: " + provider.getName());

            Security.addProvider(provider);

            Provider registered =
                    Security.getProvider(provider.getName());

            System.out.println(
                    "Registered provider: " +
                    (registered != null ? registered.getName() : "null")
            );

            System.out.println("Testing PKCS#11 KeyStore...");

            KeyStore keyStore =
                    KeyStore.getInstance("PKCS11", provider);

            System.out.println("PKCS#11 KeyStore created successfully.");

        } catch (Exception e) {

            System.out.println("FAILED:");
            e.printStackTrace();
        }
    }
}
