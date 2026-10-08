import java.security.*;
public class Verify3 {
    public static void main(String[] args) throws Exception {
        Provider base = Security.getProvider("SunPKCS11");
        String config = "--name=SoftHSM\nlibrary=C:/SoftHSM2/lib/softhsm2-x64.dll\nslot=191083967";
        Provider p = base.configure(config);
        Security.addProvider(p);
        System.out.println("SUCCESS: " + p.getName());
    }
}