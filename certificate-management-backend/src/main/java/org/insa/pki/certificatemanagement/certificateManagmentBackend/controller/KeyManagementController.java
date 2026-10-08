package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.config.annotation.Auditable;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.KeyEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.KeyManagementService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
@RestController
@RequestMapping("/api/keys/manage")
public class KeyManagementController {

    private final KeyManagementService service;

    public KeyManagementController(KeyManagementService service) {
        this.service = service;
    }

    @GetMapping
    public List<KeyEntity> listAllKeys() throws Exception {
        return service.listAllKeys();
    }

    @DeleteMapping("/{alias}")
    public String deleteKey(
            @PathVariable String alias,
            @RequestParam String pin
    ) throws Exception {
        service.deleteKey(alias, pin);
        return "Key deleted: " + alias;
    }

    @PostMapping("/rotate/{alias}")
    public String rotateKey(
            @PathVariable String alias,
            @RequestParam String pin
    ) throws Exception {
        return service.rotateKey(alias, pin);
    }

    @GetMapping("/export/public/{alias}")
    public String exportPublic(@PathVariable String alias) {
        return service.exportPublicKey(alias);
    }
}