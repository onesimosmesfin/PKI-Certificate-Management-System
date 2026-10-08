package org.insa.pki.certificatemanagement.certificateManagmentBackend.dto;

public class OcspValidationRequest {
    private String certificateAlias;
    private String issuerAlias;

    public String getCertificateAlias() { return certificateAlias; }
    public void setCertificateAlias(String certificateAlias) { this.certificateAlias = certificateAlias; }

    public String getIssuerAlias() { return issuerAlias; }
    public void setIssuerAlias(String issuerAlias) { this.issuerAlias = issuerAlias; }
}