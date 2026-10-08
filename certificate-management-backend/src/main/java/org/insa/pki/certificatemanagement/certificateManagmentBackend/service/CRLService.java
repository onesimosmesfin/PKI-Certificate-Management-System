package org.insa.pki.certificatemanagement.certificateManagmentBackend.service;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.RevokedCertificateDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.RevokedCertificate;

import java.util.List;

public interface CRLService {

    byte[] generateCRL(String caAlias, String pin) throws Exception;

    List<RevokedCertificateDTO> getRevokedCertificates();

    byte[] getLatestCRL(String caAlias);

    List<RevokedCertificateDTO> getMyRevokedCertificates();}