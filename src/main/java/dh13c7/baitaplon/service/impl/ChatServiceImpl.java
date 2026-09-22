package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.ChatDto;
import dh13c7.baitaplon.model.ChatConversation;
import dh13c7.baitaplon.model.ChatMessage;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.ChatConversationRepository;
import dh13c7.baitaplon.repository.ChatMessageRepository;
import dh13c7.baitaplon.service.ChatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    private final ChatConversationRepository conversationRepo;
    private final ChatMessageRepository messageRepo;

    @Override
    @Transactional
    public ChatDto.MessageResponse customerSendMessage(ChatDto.CustomerSendRequest req, User currentUser) {
        String conversationId;
        Long userId = null;
        String customerName;
        String customerEmail = null;

        if (currentUser != null) {
            conversationId = "user_" + currentUser.getId();
            userId = currentUser.getId();
            customerName = (currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                    ? currentUser.getFullName()
                    : currentUser.getUsername();
            customerEmail = currentUser.getEmail();
        } else {
            if (req.getConversationId() != null && !req.getConversationId().isBlank()) {
                conversationId = req.getConversationId().trim();
            } else {
                conversationId = "guest_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            }
            if (req.getCustomerName() != null && !req.getCustomerName().isBlank()) {
                customerName = req.getCustomerName().trim();
            } else {
                customerName = "Khách #" + conversationId.substring(Math.max(0, conversationId.length() - 4));
            }
            if (req.getCustomerEmail() != null && !req.getCustomerEmail().isBlank()) {
                customerEmail = req.getCustomerEmail().trim();
            }
        }

        final Long fUserId = userId;
        final String fCustomerName = customerName;
        final String fCustomerEmail = customerEmail;

        ChatConversation conversation = conversationRepo.findById(conversationId).orElseGet(() ->
                ChatConversation.builder()
                        .id(conversationId)
                        .userId(fUserId)
                        .customerName(fCustomerName)
                        .customerEmail(fCustomerEmail)
                        .createdAt(LocalDateTime.now())
                        .build()
        );

        if (userId != null) {
            conversation.setUserId(userId);
            conversation.setCustomerName(customerName);
            if (customerEmail != null) {
                conversation.setCustomerEmail(customerEmail);
            }
        } else if (req.getCustomerName() != null && !req.getCustomerName().isBlank()) {
            conversation.setCustomerName(req.getCustomerName().trim());
        }

        conversation.setLastMessage(req.getContent().trim());
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUnreadAdmin(conversation.getUnreadAdmin() + 1);
        conversationRepo.save(conversation);

        ChatMessage message = ChatMessage.builder()
                .conversationId(conversationId)
                .senderRole("CUSTOMER")
                .senderId(userId)
                .senderName(customerName)
                .content(req.getContent().trim())
                .createdAt(LocalDateTime.now())
                .build();

        message = messageRepo.save(message);
        return toMessageResponse(message);
    }

    @Override
    @Transactional
    public List<ChatDto.MessageResponse> getCustomerMessages(String conversationId, User currentUser) {
        String convId = conversationId;
        if (currentUser != null && (convId == null || convId.isBlank() || convId.startsWith("guest_"))) {
            convId = "user_" + currentUser.getId();
        }

        if (convId == null || convId.isBlank()) {
            return Collections.emptyList();
        }

        final String targetConvId = convId;
        conversationRepo.findById(targetConvId).ifPresent(c -> {
            if (c.getUnreadCustomer() > 0) {
                c.setUnreadCustomer(0);
                conversationRepo.save(c);
            }
        });

        return messageRepo.findByConversationIdOrderByCreatedAtAsc(targetConvId)
                .stream().map(this::toMessageResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChatDto.ConversationResponse> getAdminConversations() {
        return conversationRepo.findAllByOrderByLastMessageAtDesc()
                .stream().map(this::toConversationResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public List<ChatDto.MessageResponse> getAdminConversationMessages(String conversationId) {
        if (conversationId == null || conversationId.isBlank()) {
            return Collections.emptyList();
        }

        conversationRepo.findById(conversationId).ifPresent(c -> {
            if (c.getUnreadAdmin() > 0) {
                c.setUnreadAdmin(0);
                conversationRepo.save(c);
            }
        });

        return messageRepo.findByConversationIdOrderByCreatedAtAsc(conversationId)
                .stream().map(this::toMessageResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ChatDto.MessageResponse adminReply(String conversationId, String content, User adminUser) {
        ChatConversation conversation = conversationRepo.findById(conversationId)
                .orElseThrow(() -> new IllegalArgumentException("Cuộc trò chuyện không tồn tại: " + conversationId));

        String senderName = (adminUser != null && adminUser.getFullName() != null && !adminUser.getFullName().isBlank())
                ? adminUser.getFullName()
                : "Hỗ trợ viên H&G";
        Long senderId = adminUser != null ? adminUser.getId() : null;

        ChatMessage message = ChatMessage.builder()
                .conversationId(conversationId)
                .senderRole("ADMIN")
                .senderId(senderId)
                .senderName(senderName)
                .content(content.trim())
                .createdAt(LocalDateTime.now())
                .build();

        message = messageRepo.save(message);

        conversation.setLastMessage(content.trim());
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setUnreadCustomer(conversation.getUnreadCustomer() + 1);
        conversationRepo.save(conversation);

        return toMessageResponse(message);
    }

    @Override
    @Transactional(readOnly = true)
    public long countAdminUnread() {
        return conversationRepo.countTotalUnreadAdmin();
    }

    @Override
    @Transactional
    public void deleteConversation(String conversationId) {
        messageRepo.deleteByConversationId(conversationId);
        conversationRepo.deleteById(conversationId);
    }

    private ChatDto.MessageResponse toMessageResponse(ChatMessage m) {
        return ChatDto.MessageResponse.builder()
                .id(m.getId())
                .conversationId(m.getConversationId())
                .senderRole(m.getSenderRole())
                .senderId(m.getSenderId())
                .senderName(m.getSenderName())
                .content(m.getContent())
                .isRead(m.isRead())
                .createdAt(m.getCreatedAt())
                .build();
    }

    private ChatDto.ConversationResponse toConversationResponse(ChatConversation c) {
        return ChatDto.ConversationResponse.builder()
                .id(c.getId())
                .userId(c.getUserId())
                .customerName(c.getCustomerName())
                .customerEmail(c.getCustomerEmail())
                .lastMessage(c.getLastMessage())
                .lastMessageAt(c.getLastMessageAt())
                .unreadAdmin(c.getUnreadAdmin())
                .unreadCustomer(c.getUnreadCustomer())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
