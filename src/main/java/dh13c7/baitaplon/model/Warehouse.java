package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "warehouses", indexes = {
    @Index(name = "idx_warehouse_code", columnList = "warehouse_code"),
    @Index(name = "idx_warehouse_status", columnList = "status")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Warehouse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "warehouse_code", nullable = false, unique = true, length = 20)
    private String warehouseCode;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String address;

    /** Vĩ độ — dùng để tính khoảng cách giao hàng (Haversine) */
    private Double latitude;

    /** Kinh độ — dùng để tính khoảng cách giao hàng (Haversine) */
    private Double longitude;

    @Column(length = 20)
    private String phone;

    /**
     * ACTIVE — kho đang hoạt động
     * INACTIVE — kho tạm đóng / ngưng sử dụng
     */
    @Builder.Default
    @Column(nullable = false, length = 10)
    private String status = "ACTIVE";

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
