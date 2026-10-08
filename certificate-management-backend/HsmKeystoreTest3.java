import java.security.*;
import java.security.KeyStore;
import java.util.Enumeration;

public class HsmKeystoreTest3 {
    public static void main(String[] args) throws Exception {
        // 1. Register the provider with the same config as Application.java
        Provider base = Security.getProvider("SunPKCS11");
        if (base == null) {
            System.out.println("SunPKCS11 provider not found.");
            return;
        }
        String config = "--name=SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslot=492455479";
        Provider p = base.configure(config);
        Security.addProvider(p);
        System.out.println("Provider registered: " + p.getName());

        // 2. Try to load the keystore with PIN 1234
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        char[] pin = "1234".toCharArray();
        ks.load(null, pin);
        System.out.println("Keystore loaded successfully.");

        // 3. List aliases (if any)
        Enumeration<String> aliases = ks.aliases();
        while (aliases.hasMoreElements()) {
            System.out.println("Alias: " + aliases.nextElement());
        }
    }
}