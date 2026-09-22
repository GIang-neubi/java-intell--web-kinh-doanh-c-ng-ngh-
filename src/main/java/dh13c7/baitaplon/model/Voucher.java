package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "vouchers")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String code;

    @Column(length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DiscountType discountType;

    /** Giá trị giảm: % hoặc số tiền cố định */
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    /** Giá trị đơn hàng tối thiểu để áp dụng (0 = không giới hạn) */
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal minOrderValue = BigDecimal.ZERO;

    /** Số tiền giảm tối đa (null = không giới hạn, chỉ dùng với PERCENT) */
    @Column(precision = 12, scale = 2)
    private BigDecimal maxDiscount;

    /** Tổng số lượt được phép dùng */
    @Column(nullable = false)
    @Builder.Default
    private Integer quantity = 0;

    /** Số lượt đã dùng */
    @Column(nullable = false)
    @Builder.Default
    private Integer usedQuantity = 0;

    @Column(nullable = false)
    private LocalDateTime startDate;

    @Column(nullable = false)
    private LocalDateTime endDate;

    /** true = đang hoạt động */
    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
