package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.ChatDto;
import dh13c7.baitaplon.model.User;

import java.util.List;

public interface ChatService {

    ChatDto.MessageResponse customerSendMessage(ChatDto.CustomerSendRequest req, User currentUser);

    List<ChatDto.MessageResponse> getCustomerMessages(String conversationId, User currentUser);

    List<ChatDto.ConversationResponse> getAdminConversations();

    List<ChatDto.MessageResponse> getAdminConversationMessages(String conversationId);

    ChatDto.MessageResponse adminReply(String conversationId, String content, User adminUser);

    long countAdminUnread();

    void deleteConversation(String conversationId);
}
