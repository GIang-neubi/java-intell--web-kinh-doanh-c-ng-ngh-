package dh13c7.baitaplon.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AiChatRequest {
    @NotBlank(message = "Message cannot be blank")
    @Size(max = 1000, message = "Tin nhắn tối đa 1000 ký tự")
    private String message;

    private List<AiChatMessageDto> history = new ArrayList<>();

    public AiChatRequest(String message) {
        this.message = message;
        this.history = new ArrayList<>();
    }
}
