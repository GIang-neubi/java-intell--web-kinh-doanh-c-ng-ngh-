package dh13c7.baitaplon.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

public class ChatDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CustomerSendRequest {
        private String conversationId; // Nếu null hoặc rỗng, server sẽ sinh mới hoặc lấy theo user
        @NotBlank(message = "Nội dung tin nhắn không được để trống")
        private String content;
        private String customerName;
        private String customerEmail;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class AdminReplyRequest {
        @NotBlank(message = "Nội dung phản hồi không được để trống")
        private String content;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MessageResponse {
        private Long id;
        private String conversationId;
        private String senderRole; // CUSTOMER, ADMIN
        private Long senderId;
        private String senderName;
        private String content;
        private boolean isRead;
        private LocalDateTime createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ConversationResponse {
        private String id;
        private Long userId;
        private String customerName;
        private String customerEmail;
        private String lastMessage;
        private LocalDateTime lastMessageAt;
        private int unreadAdmin;
        private int unreadCustomer;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
