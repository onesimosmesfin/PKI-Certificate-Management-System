package org.insa.pki.certificatemanagement.certificateManagmentBackend.controller;


import org.insa.pki.certificatemanagement.certificateManagmentBackend.dto.UserDTO;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    // =========================================
    // CONSTRUCTOR
    // =========================================

    public UserController(UserService userService) {
        this.userService = userService;
    }

    // =========================================
    // GET USERS
    // =========================================

    @PreAuthorize("hasAnyRole('ADMIN','AUDITOR')")
    @GetMapping
    public ResponseEntity<List<UserDTO>> getAllUsers() {

        return ResponseEntity.ok(
                userService.getAllUsers()
        );
    }

    // =========================================
    // DELETE USER
    // =========================================

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(
            @PathVariable Long id
    ) {

        userService.deleteUser(id);

        return ResponseEntity.ok(
                "User deleted successfully"
        );
    }
}