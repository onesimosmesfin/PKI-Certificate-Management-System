package org.insa.pki.certificatemanagement.certificateManagmentBackend.repository;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.CertificateEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CertificateRepository extends JpaRepository<CertificateEntity, Long> {

    Optional<CertificateEntity> findByAlias(String alias);
    Optional<CertificateEntity> findBySerialNumber(String serialNumber);

    Optional<CertificateEntity> findByFingerprint(String fingerprint);

    List<CertificateEntity> findByCreatedBy(String createdBy);

    List<CertificateEntity> findByTypeIn(List<String> types);
}