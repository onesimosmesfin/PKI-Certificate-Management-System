import java.security.*;
public class PkcsPinProbe {
  public static void main(String[] args) throws Exception {
    System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
    Provider base = Security.getProvider("SunPKCS11");
    String[] pins = {"12121212", "1234", "123456", "0000", "password", "admin123", "secret", "1111", "12345678"};
    for (String pin : pins) {
      try {
        Provider p = base.configure("--name=PinProbe\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslotListIndex=0");
        Security.addProvider(p);
        KeyStore ks = KeyStore.getInstance("PKCS11", p);
        ks.load(null, pin.toCharArray());
        System.out.println("PIN_OK " + pin);
      } catch (Exception e) {
        System.out.println("PIN_FAIL " + pin + " => " + e.getClass().getSimpleName() + ": " + e.getMessage());
      }
    }
  }
}
