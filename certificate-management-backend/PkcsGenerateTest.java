import java.security.*;
import java.util.*;
public class PkcsGenerateTest {
  public static void main(String[] args) throws Exception {
    System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
    String config = "--name=SunPKCS11-SoftHSM\n" +
      "library=C:/SoftHSM2/lib/softhsm2-x64.dll\n" +
      "slotListIndex=0";
    Provider base = Security.getProvider("SunPKCS11");
    Provider p = base.configure(config);
    Security.addProvider(p);
    System.out.println("provider=" + p.getName());
    KeyStore ks = KeyStore.getInstance("PKCS11", p);
    ks.load(null, "12121212".toCharArray());
    System.out.println("keystore loaded");
    KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA", p);
    kpg.initialize(2048);
    KeyPair kp = kpg.generateKeyPair();
    System.out.println("generated public=" + kp.getPublic().getAlgorithm());
  }
}
