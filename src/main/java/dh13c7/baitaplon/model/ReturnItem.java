package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "return_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReturnItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private ReturnRequest returnRequest;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(nullable = false)
    private Integer quantity;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ReturnCondition condition;

    @Column(columnDefinition = "TEXT")
    private String note;
}
