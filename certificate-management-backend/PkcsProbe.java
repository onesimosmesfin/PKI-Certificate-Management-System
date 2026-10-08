import java.security.*;
public class PkcsProbe {
  public static void main(String[] args) throws Exception {
    System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
    String config = "--name=SoftHSM\n" +
      "library=C:/SoftHSM2/lib/softhsm2-x64.dll\n" +
      "slotListIndex=0";
    Provider base = Security.getProvider("SunPKCS11");
    System.out.println("base=" + base);
    if (base != null) {
      Provider p = base.configure(config);
      System.out.println("p=" + p.getName());
      Security.addProvider(p);
      System.out.println("providers=" + Security.getProviders().length);
    }
  }
}
