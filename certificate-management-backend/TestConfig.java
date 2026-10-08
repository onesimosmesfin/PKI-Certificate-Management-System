import java.security.*;
import java.security.KeyStore;

public class TestConfig {
    public static void main(String[] args) throws Exception {
        Provider base = Security.getProvider("SunPKCS11");
        String config = "--name=SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslot=1548694388";
        System.out.println("Config:\n" + config);
        Provider p = base.configure(config);
        Security.addProvider(p);
        System.out.println("Provider registered: " + p.getName());
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        ks.load(null, "12345678".toCharArray());
        System.out.println("Keystore loaded successfully with new token.");
    }
}