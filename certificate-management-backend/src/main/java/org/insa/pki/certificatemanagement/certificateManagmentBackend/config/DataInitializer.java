package org.insa.pki.certificatemanagement.certificateManagmentBackend.config;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.Role;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.UserEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UserRepository userRepository,
                           PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {

        createUserIfNotExists("admin", "admin123", Role.ADMIN, "admin@pki.local");
        createUserIfNotExists("auditor", "auditor123", Role.AUDITOR, "auditor@pki.local");

        System.out.println("✅ Default users initialized");
    }

    private void createUserIfNotExists(
            String username,
            String password,
            Role role,
            String email
    ) {

        if (userRepository.findByUsername(username).isEmpty()) {

            UserEntity user = new UserEntity();

            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setRole(role);
            user.setEnabled(true);
            user.setApproved(true);

            userRepository.save(user);

            System.out.println(
                    "✅ Created user: " +
                            username +
                            " with role " +
                            role
            );
        }
    }
}