package dh13c7.baitaplon.config;

import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // Đảm bảo cột role trong bảng users có độ dài đủ chứa ROLE_SHIPPER (12 ký tự)
        try {
            jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN role VARCHAR(30) NOT NULL");
            log.info("Ensured column 'role' in table 'users' is VARCHAR(30)");
        } catch (Exception e) {
            log.debug("Notice on altering users.role column: {}", e.getMessage());
        }

        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@hg.com")
                    .password(passwordEncoder.encode("12345678"))
                    .fullName("H&G Admin")
                    .phone("0900000000")
                    .role(Role.ROLE_ADMIN)
                    .build();
            userRepository.save(admin);
            log.info("Created default admin account: admin / 12345678");
        }

        if (!userRepository.existsByUsername("shipper1")) {
            User shipper1 = User.builder()
                    .username("shipper1")
                    .email("shipper1@hg.com")
                    .password(passwordEncoder.encode("12345678"))
                    .fullName("Nguyễn Văn Nam (Shipper Nhanh)")
                    .phone("0912345678")
                    .role(Role.ROLE_SHIPPER)
                    .build();
            userRepository.save(shipper1);
            log.info("Created default shipper account: shipper1 / 12345678");
        }

        if (!userRepository.existsByUsername("shipper2")) {
            User shipper2 = User.builder()
                    .username("shipper2")
                    .email("shipper2@hg.com")
                    .password(passwordEncoder.encode("12345678"))
                    .fullName("Trần Văn Hùng (Shipper Tiết Kiệm)")
                    .phone("0987654321")
                    .role(Role.ROLE_SHIPPER)
                    .build();
            userRepository.save(shipper2);
            log.info("Created default shipper account: shipper2 / 12345678");
        }
    }
}
