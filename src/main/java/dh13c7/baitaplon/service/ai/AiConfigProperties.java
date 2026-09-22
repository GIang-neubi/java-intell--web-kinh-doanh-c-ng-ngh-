package dh13c7.baitaplon.service.ai;

import lombok.Data;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
@Data
public class AiConfigProperties {

    @Value("${hg.ai.enabled:true}")
    private boolean enabled = true;

    @Value("${hg.ai.provider:gemini}")
    private String provider = "gemini";

    @Value("${gemini.api.model:${hg.ai.model:gemini-1.5-flash}}")
    private String model = "gemini-1.5-flash";

    @Value("${hg.ai.temperature:0.4}")
    private Double temperature = 0.4;

    @Value("${hg.ai.max-tokens:800}")
    private Integer maxTokens = 800;

    @Value("${gemini.api.key:${gemini.local-api-key:}}")
    private String geminiApiKey;

    private String systemPromptCustom = "";

    public boolean hasValidGeminiKey() {
        return geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.contains("YOUR_API_KEY") && geminiApiKey.startsWith("AIzaSy");
    }

    public String getMaskedApiKey() {
        if (!hasValidGeminiKey()) return "Chưa cấu hình (đang dùng DB Grounded Fallback Engine)";
        int len = geminiApiKey.length();
        if (len <= 8) return "********";
        return geminiApiKey.substring(0, 4) + "..." + geminiApiKey.substring(len - 4);
    }
}
