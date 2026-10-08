package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CsrResponse;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CsrEntity;

import java.util.List;
public interface CsrService {

    CsrResponse generateCsr(CsrRequest request) throws Exception;
    List<CsrEntity> getAllCsrs();
    List<CsrEntity> getMyCsrs();

    CsrEntity getCsrById(Long id);

    byte[] exportCsr(Long id);

    void deleteCsr(Long id);

    void revokeCsr(Long id, String reason);

    void approveCsr(Long id);
    org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity approveAndIssue(Long id, org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request) throws Exception;

    CsrEntity importCsr(String alias, String pem);
}