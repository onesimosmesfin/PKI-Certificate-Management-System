package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.Application;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.KeyRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.KeyRepository;
import org.springframework.stereotype.Service;

import java.security.KeyStore;
import java.security.Security;
import java.security.Provider;
import java.util.List;

@Service
public class KeyManagementServiceImpl implements KeyManagementService {

    private final KeyRepository keyRepository;
    private final HsmService hsmService;

    public KeyManagementServiceImpl(KeyRepository keyRepository,
                                    HsmService hsmService) {
        this.keyRepository = keyRepository;
        this.hsmService = hsmService;
    }


   @Override
public List<KeyEntity> listAllKeys() throws Exception {
    return keyRepository.findAll();
}

    @Override
    public void deleteKey(String alias, String pin) throws Exception {

        KeyEntity key = keyRepository.findByAlias(alias)
                .orElseThrow(() -> new RuntimeException("Key not found"));

        if (!Boolean.TRUE.equals(key.getIsHsmKey())) {
            throw new RuntimeException("❌ Non-HSM keys are not allowed anymore");
        }

        // Ensure SoftHSM provider is registered
        Provider p = Security.getProvider(Application.SOFTHSM_PROVIDER_LOOKUP_NAME);
        if (p == null) {
            p = Application.registerSoftHsmProvider();
        }

        KeyStore ks = KeyStore.getInstance("PKCS11", p);

        // Login to the HSM using the supplied User PIN
        ks.load(null, pin.toCharArray());

        if (!ks.containsAlias(alias)) {
            throw new RuntimeException("Key alias not found in HSM: " + alias);
        }

        ks.deleteEntry(alias);

        keyRepository.delete(key);
    }

    @Override
    public String rotateKey(String alias, String pin) throws Exception {

        KeyEntity oldKey = keyRepository.findByAlias(alias)
                .orElseThrow(() -> new RuntimeException("Key not found"));

        if (!Boolean.TRUE.equals(oldKey.getIsHsmKey())) {
            throw new RuntimeException("❌ Only HSM keys can be rotated");
        }

        String newAlias = alias + "_rotated_" + System.currentTimeMillis();

        KeyRequest request = new KeyRequest();
        request.setAlias(newAlias);
        request.setAlgorithm(oldKey.getAlgorithm());
        request.setKeySize(oldKey.getKeySize());
        request.setCurveName(oldKey.getCurveName());
        request.setPassword(pin);

        hsmService.generateKey(request);

        deleteKey(alias, pin);

        return "🔁 Key rotated in HSM → " + newAlias;
    }

    @Override
    public String exportPublicKey(String alias) {

        KeyEntity key = keyRepository.findByAlias(alias)
                .orElseThrow(() -> new RuntimeException("Key not found"));

        return key.getPublicKey();
    }

    @Override
    public String exportPrivateKey(String alias) {
        throw new RuntimeException(
                "❌ Private key export is forbidden (HSM protected)"
        );
    }

    @Override
    public String importKey() {
        throw new RuntimeException(
                "❌ Importing private keys is not allowed in HSM-only mode"
        );
    }
}