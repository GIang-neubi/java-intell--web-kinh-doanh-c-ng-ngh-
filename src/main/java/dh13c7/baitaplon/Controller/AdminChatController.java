package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.ChatDto;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/chat")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    @GetMapping("/conversations")
    public ResponseEntity<ApiResponse<List<ChatDto.ConversationResponse>>> getConversations() {
        List<ChatDto.ConversationResponse> list = chatService.getAdminConversations();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách cuộc trò chuyện thành công", list));
    }

    @GetMapping("/conversations/{conversationId}/messages")
    public ResponseEntity<ApiResponse<List<ChatDto.MessageResponse>>> getConversationMessages(
            @PathVariable String conversationId) {
        List<ChatDto.MessageResponse> messages = chatService.getAdminConversationMessages(conversationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết tin nhắn thành công", messages));
    }

    @PostMapping("/conversations/{conversationId}/reply")
    public ResponseEntity<ApiResponse<ChatDto.MessageResponse>> adminReply(
            @PathVariable String conversationId,
            @Valid @RequestBody ChatDto.AdminReplyRequest req) {
        User adminUser = getRequiredCurrentUser();
        ChatDto.MessageResponse reply = chatService.adminReply(conversationId, req.getContent(), adminUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "Gửi phản hồi thành công", reply));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        long unread = chatService.countAdminUnread();
        return ResponseEntity.ok(new ApiResponse<>(true, "Thành công", Map.of("unreadCount", unread)));
    }

    @DeleteMapping("/conversations/{conversationId}")
    public ResponseEntity<ApiResponse<Void>> deleteConversation(@PathVariable String conversationId) {
        chatService.deleteConversation(conversationId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Xóa cuộc trò chuyện thành công", null));
    }

    private User getRequiredCurrentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userRepository.findById(userDetails.getId()).orElse(null);
        }
        return null;
    }
}
