package dh13c7.baitaplon.config;

import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.AddressRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.repository.VoucherRepository;
import dh13c7.baitaplon.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminDataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final WarehouseRepository warehouseRepository;
    private final VoucherRepository voucherRepository;
    private final AddressRepository addressRepository;
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

        // 1. TÀI KHOẢN ADMIN
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

        // 2. TÀI KHOẢN SHIPPERS
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

        // 3. TÀI KHOẢN KHÁCH HÀNG DEMO
        User customer = userRepository.findByUsername("customer").orElse(null);
        if (customer == null) {
            customer = User.builder()
                    .username("customer")
                    .email("customer@hg.com")
                    .password(passwordEncoder.encode("12345678"))
                    .fullName("Nguyễn Văn Dương (Khách hàng VIP)")
                    .phone("0988889999")
                    .role(Role.ROLE_USER)
                    .build();
            customer = userRepository.save(customer);
            log.info("Created default customer account: customer / 12345678");
        }

        // 4. SỔ ĐỊA CHỈ KHÁCH HÀNG
        if (addressRepository.countByUserId(customer.getId()) == 0) {
            Address addr1 = Address.builder()
                    .user(customer)
                    .recipientName("Nguyễn Văn Dương")
                    .phone("0988889999")
                    .province("Thành phố Hà Nội")
                    .district("Quận Thanh Xuân")
                    .ward("Phường Khương Trung")
                    .detailAddress("Số 45 Nguyễn Trãi")
                    .fullAddress("Số 45 Nguyễn Trãi, Phường Khương Trung, Quận Thanh Xuân, Hà Nội")
                    .addressType("HOME")
                    .isDefault(true)
                    .latitude(20.9980)
                    .longitude(105.8150)
                    .build();
            addressRepository.save(addr1);

            Address addr2 = Address.builder()
                    .user(customer)
                    .recipientName("Nguyễn Văn Dương")
                    .phone("0988889999")
                    .province("Thành phố Hà Nội")
                    .district("Quận Cầu Giấy")
                    .ward("Phường Dịch Vọng Hậu")
                    .detailAddress("Tòa nhà H&G Tech, 18 Xuân Thủy")
                    .fullAddress("18 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội")
                    .addressType("OFFICE")
                    .isDefault(false)
                    .latitude(21.0368)
                    .longitude(105.7836)
                    .build();
            addressRepository.save(addr2);
            log.info("Created default customer addresses for customer: customer");
        }

        // 5. DANH MỤC KHO HÀNG H&G
        if (warehouseRepository.count() == 0) {
            Warehouse whHn = Warehouse.builder()
                    .warehouseCode("KHO_HN_01")
                    .name("Kho Tổng H&G Hà Nội")
                    .address("45 Nguyễn Trãi, Phường Khương Trung, Quận Thanh Xuân, Hà Nội")
                    .phone("024.3855.9999")
                    .latitude(20.9980)
                    .longitude(105.8150)
                    .status("ACTIVE")
                    .build();
            warehouseRepository.save(whHn);

            Warehouse whCg = Warehouse.builder()
                    .warehouseCode("KHO_CG_01")
                    .name("Kho H&G Cầu Giấy")
                    .address("18 Xuân Thủy, Phường Dịch Vọng Hậu, Quận Cầu Giấy, Hà Nội")
                    .phone("024.3768.8888")
                    .latitude(21.0368)
                    .longitude(105.7836)
                    .status("ACTIVE")
                    .build();
            warehouseRepository.save(whCg);

            Warehouse whDn = Warehouse.builder()
                    .warehouseCode("KHO_DN_01")
                    .name("Kho H&G Đà Nẵng")
                    .address("123 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, Đà Nẵng")
                    .phone("0236.388.7777")
                    .latitude(16.0610)
                    .longitude(108.2180)
                    .status("ACTIVE")
                    .build();
            warehouseRepository.save(whDn);

            Warehouse whHcm = Warehouse.builder()
                    .warehouseCode("KHO_HCM_01")
                    .name("Kho H&G TP. Hồ Chí Minh")
                    .address("79 Lê Lợi, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh")
                    .phone("028.3822.6666")
                    .latitude(10.7745)
                    .longitude(106.7010)
                    .status("ACTIVE")
                    .build();
            warehouseRepository.save(whHcm);
            log.info("Seeded 4 default active warehouses with GPS coordinates");
        }

        // 6. KHO MÃ GIẢM GIÁ (VOUCHERS)
        if (voucherRepository.count() == 0) {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime expiry = now.plusYears(2);

            Voucher v1 = Voucher.builder()
                    .code("HNG10")
                    .description("Giảm 10% (tối đa 500.000đ) cho đơn hàng từ 1.000.000đ")
                    .discountType(DiscountType.PERCENT)
                    .discountValue(BigDecimal.valueOf(10))
                    .minOrderValue(BigDecimal.valueOf(1000000))
                    .maxDiscount(BigDecimal.valueOf(500000))
                    .quantity(500)
                    .usedQuantity(0)
                    .startDate(now.minusDays(1))
                    .endDate(expiry)
                    .build();
            voucherRepository.save(v1);

            Voucher v2 = Voucher.builder()
                    .code("WELCOME2026")
                    .description("Giảm ngay 50.000đ cho đơn hàng chào mừng thành viên mới từ 500.000đ")
                    .discountType(DiscountType.FIXED)
                    .discountValue(BigDecimal.valueOf(50000))
                    .minOrderValue(BigDecimal.valueOf(500000))
                    .quantity(1000)
                    .usedQuantity(0)
                    .startDate(now.minusDays(1))
                    .endDate(expiry)
                    .build();
            voucherRepository.save(v2);

            Voucher v3 = Voucher.builder()
                    .code("FREESHIP")
                    .description("Miễn phí vận chuyển giao hàng tiêu chuẩn (giảm tối đa 30.000đ)")
                    .discountType(DiscountType.FIXED)
                    .discountValue(BigDecimal.valueOf(30000))
                    .minOrderValue(BigDecimal.valueOf(300000))
                    .quantity(1000)
                    .usedQuantity(0)
                    .startDate(now.minusDays(1))
                    .endDate(expiry)
                    .build();
            voucherRepository.save(v3);
            log.info("Seeded 3 default vouchers: HNG10, WELCOME2026, FREESHIP");
        }
    }
}
