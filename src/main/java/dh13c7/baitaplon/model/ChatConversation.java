package dh13c7.baitaplon.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_conversations")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatConversation {
    @Id
    @Column(length = 64)
    private String id;

    private Long userId;

    @Column(nullable = false)
    private String customerName;

    private String customerEmail;

    @Column(length = 1000)
    private String lastMessage;

    private LocalDateTime lastMessageAt;

    @Builder.Default
    private int unreadAdmin = 0;

    @Builder.Default
    private int unreadCustomer = 0;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
