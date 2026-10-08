package org.insa.pki.certificatemanagement.certificateManagmentBackend.dto;

public class KeyImportRequest {

    private String alias;
    private String algorithm;
    private String privateKey;
    private String password;

    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }

    public String getAlgorithm() { return algorithm; }
    public void setAlgorithm(String algorithm) { this.algorithm = algorithm; }

    public String getPrivateKey() { return privateKey; }
    public void setPrivateKey(String privateKey) { this.privateKey = privateKey; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}