package org.insa.pki.certificatemanagement.certificateManagmentBackend.model;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "revoked_certificates")
public class RevokedCertificate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String certificateAlias;
    private String issuerAlias;
    private String serialNumber;

    @Temporal(TemporalType.TIMESTAMP)
    private Date revocationDate;

    @Enumerated(EnumType.STRING)
    private RevocationReason reason;

    private String comment;

    private String revokedBy;

    private String correlationId;

    public RevokedCertificate() {}

    public RevokedCertificate(String certificateAlias,
                              String issuerAlias,
                              String serialNumber,
                              Date revocationDate,
                              RevocationReason reason) {
        this.certificateAlias = certificateAlias;
        this.issuerAlias = issuerAlias;
        this.serialNumber = serialNumber;
        this.revocationDate = revocationDate;
        this.reason = reason;
    }


    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCertificateAlias() {
        return certificateAlias;
    }

    public void setCertificateAlias(String certificateAlias) {
        this.certificateAlias = certificateAlias;
    }

    public String getIssuerAlias() {
        return issuerAlias;
    }

    public void setIssuerAlias(String issuerAlias) {
        this.issuerAlias = issuerAlias;
    }

    public String getSerialNumber() {
        return serialNumber;
    }

    public void setSerialNumber(String serialNumber) {
        this.serialNumber = serialNumber;
    }

    public Date getRevocationDate() {
        return revocationDate;
    }

    public void setRevocationDate(Date revocationDate) {
        this.revocationDate = revocationDate;
    }

    public RevocationReason getReason() {
        return reason;
    }

    public void setReason(RevocationReason reason) {
        this.reason = reason;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getRevokedBy() {
        return revokedBy;
    }

    public void setRevokedBy(String revokedBy) {
        this.revokedBy = revokedBy;
    }

    public String getCorrelationId() {
        return correlationId;
    }

    public void setCorrelationId(String correlationId) {
        this.correlationId = correlationId;
    }
}