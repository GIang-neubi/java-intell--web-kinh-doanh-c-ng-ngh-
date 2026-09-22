package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatMessageDto {
    private String role; // "user" or "assistant" / "model"
    private String content;
}
