import java.security.*;
import java.security.KeyStore;
import java.util.Enumeration;

public class ListAliases {
    public static void main(String[] args) throws Exception {
        Provider base = Security.getProvider("SunPKCS11");
        String config = "--name=SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslot=112996702";
        Provider p = base.configure(config);
        Security.addProvider(p);
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        ks.load(null, "1234".toCharArray());
        Enumeration<String> aliases = ks.aliases();
        System.out.println("Aliases in HSM:");
        while (aliases.hasMoreElements()) {
            String alias = aliases.nextElement();
            System.out.println("  " + alias);
            if (ks.isKeyEntry(alias)) {
                System.out.println("    -> key entry");
            }
            if (ks.isCertificateEntry(alias)) {
                System.out.println("    -> certificate entry");
            }
        }
    }
}