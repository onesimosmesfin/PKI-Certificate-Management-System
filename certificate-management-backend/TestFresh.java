import java.security.*;

public class TestFresh {
    public static void main(String[] args) throws Exception {
        System.setProperty("SOFTHSM2_CONF", "C:/SoftHSM2/etc/softhsm2.conf");
        Provider base = Security.getProvider("SunPKCS11");
        String config = "--name=SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslot=960269531";
        Provider p = base.configure(config);
        Security.addProvider(p);
        System.out.println("SUCCESS: " + p.getName());
    }
}