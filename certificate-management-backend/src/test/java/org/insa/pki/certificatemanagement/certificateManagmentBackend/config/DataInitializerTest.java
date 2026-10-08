package org.insa.pki.certificatemanagement.certificateManagmentBackend.config;

import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.Role;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.model.UserEntity;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.repository.UserRepository;
import org.insa.pki.certificatemanagement.certificateManagmentBackend.service.CustomUserDetailsService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class DataInitializerTest {

    @Test
    void run_shouldCreateDefaultUsersWithEmail() {
        UserRepository userRepository = mock(UserRepository.class);
        when(userRepository.findByUsername("admin")).thenReturn(Optional.empty());
        when(userRepository.findByUsername("auditor")).thenReturn(Optional.empty());

        PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
        DataInitializer initializer = new DataInitializer(userRepository, passwordEncoder);

        initializer.run();

        ArgumentCaptor<UserEntity> captor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository, times(2)).save(captor.capture());

        assertThat(captor.getAllValues())
                .allSatisfy(user -> {
                    assertThat(user.getUsername()).isIn("admin", "auditor");
                    assertThat(user.getEmail()).isNotBlank();
                    assertThat(user.getRole()).isIn(Role.ADMIN, Role.AUDITOR);
                    assertThat(user.getPassword()).isNotBlank();
                    assertThat(user.isApproved()).isTrue();
                    assertThat(user.isEnabled()).isTrue();
                });
    }

    @Test
    void loadUserByUsername_shouldMarkPendingApprovalAsAccountLocked() {
        UserRepository userRepository = mock(UserRepository.class);
        UserEntity operator = new UserEntity();
        operator.setUsername("operator-sample");
        operator.setPassword("encoded-password");
        operator.setRole(Role.CA_OPERATOR);
        operator.setEnabled(true);
        operator.setApproved(false);

        when(userRepository.findByUsername("operator-sample")).thenReturn(Optional.of(operator));

        CustomUserDetailsService service = new CustomUserDetailsService(userRepository);

        UserDetails details = service.loadUserByUsername("operator-sample");

        assertThat(details.getUsername()).isEqualTo("operator-sample");
        assertThat(details.isEnabled()).isTrue();
        assertThat(details.isAccountNonLocked()).isFalse();
        assertThat(details.getAuthorities()).extracting("authority").containsExactly("ROLE_CA_OPERATOR");
    }
}
