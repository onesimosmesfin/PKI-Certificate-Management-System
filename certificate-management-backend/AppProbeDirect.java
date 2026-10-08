import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import java.security.*;
public class AppProbeDirect {
  public static void main(String[] args) throws Exception {
    System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
    Provider p = Application.registerSoftHsmProvider();
    System.out.println("provider=" + p.getName());
    KeyStore ks = KeyStore.getInstance("PKCS11", p);
    ks.load(null, "12121212".toCharArray());
    System.out.println("keystore loaded");
    KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA", p);
    kpg.initialize(2048);
    KeyPair kp = kpg.generateKeyPair();
    System.out.println("rsa generated=" + kp.getPublic().getAlgorithm());
  }
}
