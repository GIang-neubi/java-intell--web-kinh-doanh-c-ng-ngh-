package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "deliveries")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Delivery {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false, unique = true)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "shipper_id")
    private User shipper;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "warehouse_id")
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private Warehouse warehouse;

    @Column(name = "total_weight_kg", precision = 10, scale = 3)
    private BigDecimal totalWeightKg;

    @Column(name = "distance_km")
    private Double distanceKm;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShippingMethod shippingMethod;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal shippingFee = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DeliveryStatus status = DeliveryStatus.PENDING_ASSIGNMENT;

    private String estimatedDelivery;

    @Column(nullable = false)
    private String receiverName;

    @Column(nullable = false)
    private String receiverPhone;

    @Column(nullable = false)
    private String deliveryAddress;

    private LocalDateTime assignedAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime pickedUpAt;
    private LocalDateTime inTransitAt;
    private LocalDateTime arrivedAt;
    private LocalDateTime deliveredAt;
    private LocalDateTime failedAt;

    private String failureReason;

    @Column(columnDefinition = "TEXT")
    private String failureNote;

    @Builder.Default
    @Column(nullable = false)
    private Integer deliveryAttempts = 1;

    private LocalDateTime nextDeliverySchedule;

    @Column(columnDefinition = "TEXT")
    private String reAttemptNote;

    @Builder.Default
    @Column(nullable = false)
    private Boolean returnedToWarehouse = false;

    @Column(length = 10)
    private String confirmationOtp;

    @Builder.Default
    private Integer otpAttempts = 0;

    private String proofImage;

    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastLocationUpdate;

    @Builder.Default
    @Column(nullable = false)
    private Boolean codSettled = false;

    private LocalDateTime codSettledAt;

    @Column(columnDefinition = "TEXT")
    private String codSettlementNote;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "delivery", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    @OrderBy("createdAt ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<DeliveryTracking> trackings = new ArrayList<>();

    public void addTracking(DeliveryStatus status, String note, Double lat, Double lng) {
        DeliveryTracking tracking = DeliveryTracking.builder()
                .delivery(this)
                .status(status)
                .note(note)
                .latitude(lat)
                .longitude(lng)
                .build();
        this.trackings.add(tracking);
    }
}
