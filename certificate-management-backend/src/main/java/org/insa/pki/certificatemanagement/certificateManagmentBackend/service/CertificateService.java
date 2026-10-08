package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.SignCsrRequest;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity;

import java.util.List;

public interface CertificateService {

    String signCsr(SignCsrRequest request) throws Exception;

    List<CertificateEntity> getCaCertificates();

    List<CertificateEntity> getMyCertificates();



    CertificateDTO getCertificateById(Long id);

    String downloadPem(Long id);

    boolean verifyCertificate(Long id);

    void revokeCertificate(Long id, String reason);

    String importCertificate(org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.CertificateImportRequest request) throws Exception;

    byte[] downloadDer(Long id);

    byte[] downloadPfx(Long id, String password) throws Exception;

    String renewCertificate(Long id, org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RenewalRequest request) throws Exception;

    java.util.List<org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity> getAllCertificates();

    void deleteCertificate(Long id);
}