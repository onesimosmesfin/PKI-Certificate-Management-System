import java.security.*;
import java.security.KeyStore;
import java.util.Enumeration;

public class HsmKeystoreTest2 {
    public static void main(String[] args) throws Exception {
        Provider base = Security.getProvider("SunPKCS11");
        if (base == null) {
            System.out.println("SunPKCS11 provider not found.");
            return;
        }
        String config = "--name=SunPKCS11-SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslotListIndex=0";
        Provider p = base.configure(config);
        Security.addProvider(p);
        System.out.println("Provider registered: " + p.getName());
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