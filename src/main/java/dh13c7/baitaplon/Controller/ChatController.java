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
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final UserRepository userRepository;

    @PostMapping("/send")
    public ResponseEntity<ApiResponse<ChatDto.MessageResponse>> customerSendMessage(
            @Valid @RequestBody ChatDto.CustomerSendRequest req) {
        User currentUser = getOptionalCurrentUser();
        ChatDto.MessageResponse response = chatService.customerSendMessage(req, currentUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "Gửi tin nhắn thành công", response));
    }

    @GetMapping("/messages")
    public ResponseEntity<ApiResponse<List<ChatDto.MessageResponse>>> getCustomerMessages(
            @RequestParam(required = false) String conversationId) {
        User currentUser = getOptionalCurrentUser();
        List<ChatDto.MessageResponse> messages = chatService.getCustomerMessages(conversationId, currentUser);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy tin nhắn thành công", messages));
    }

    private User getOptionalCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
                return userRepository.findById(userDetails.getId()).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }
}
