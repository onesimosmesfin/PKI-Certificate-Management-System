package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.KeyImportRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity;

import java.util.List;

public interface KeyManagementService {

    List<KeyEntity> listAllKeys() throws Exception;

    void deleteKey(String alias, String pin) throws Exception;

    String rotateKey(String alias, String pin) throws Exception;

    String exportPublicKey(String alias);

    String exportPrivateKey(String alias) throws Exception;

    String importKey() throws Exception;
}