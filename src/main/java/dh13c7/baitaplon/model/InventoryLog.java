package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "inventory_logs", indexes = {
    @Index(name = "idx_inv_product", columnList = "product_id"),
    @Index(name = "idx_inv_warehouse", columnList = "warehouse_id"),
    @Index(name = "idx_inv_created_at", columnList = "created_at")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InventoryLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Warehouse warehouse;

    @Column(nullable = false)
    private String type; // IMPORT, EXPORT

    @Column(nullable = false)
    private int quantity;

    @Column(columnDefinition = "TEXT")
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private User createdBy;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
}
