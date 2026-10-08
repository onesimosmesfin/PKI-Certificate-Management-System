import java.security.*;
public class PkcsScan {
  public static void main(String[] args) throws Exception {
    System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
    Provider base = Security.getProvider("SunPKCS11");
    System.out.println("base=" + base);
    for (int i = 0; i <= 20; i++) {
      String config = "--name=SoftHSM" + i + "\n" +
        "library=C:/SoftHSM2/lib/softhsm2-x64.dll\n" +
        "slotListIndex=" + i;
      try {
        Provider p = base.configure(config);
        System.out.println("SUCCESS " + i + " => " + p.getName());
        Security.addProvider(p);
      } catch (Exception e) {
        System.out.println("FAIL " + i + " => " + e.getClass().getSimpleName() + ": " + e.getMessage());
      }
    }
  }
}
