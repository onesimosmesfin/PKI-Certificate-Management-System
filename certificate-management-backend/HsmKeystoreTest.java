import java.security.*;
import java.security.KeyStore;
import java.util.Enumeration;

public class HsmKeystoreTest {
    public static void main(String[] args) throws Exception {
        Provider p = Security.getProvider("SunPKCS11-SoftHSM");
        if (p == null) {
            System.out.println("Provider SunPKCS11-SoftHSM not found.");
            return;
        }
        System.out.println("Provider found: " + p.getName());
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        char[] pin = "1234".toCharArray();
        ks.load(null, pin);
        System.out.println("Keystore loaded successfully.");
        Enumeration<String> aliases = ks.aliases();
        while (aliases.hasMoreElements()) {
            System.out.println("Alias: " + aliases.nextElement());
        }
    }
}