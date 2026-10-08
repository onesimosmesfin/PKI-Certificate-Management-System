package org.insa.pki.certificatemanagement.certificateManagmentBackend.dto;

public class RenewalRequest {
    private String alias;
    private int validityDays;
    private String caAlias;
    private String pin;

    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }

    public int getValidityDays() { return validityDays; }
    public void setValidityDays(int validityDays) { this.validityDays = validityDays; }

    public String getCaAlias() { return caAlias; }
    public void setCaAlias(String caAlias) { this.caAlias = caAlias; }

    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }
}