package dh13c7.baitaplon.service.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import dh13c7.baitaplon.dto.AiChatMessageDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class GeminiAiProvider implements AiProvider {

    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private final AiConfigProperties config;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout(12000);
        return new RestTemplate(factory);
    }

    @Override
    public String getProviderName() {
        return "gemini";
    }

    @Override
    public boolean isAvailable() {
        return config.isEnabled() && config.hasValidGeminiKey();
    }

    @Override
    public String generateResponse(String systemPrompt, List<AiChatMessageDto> history, String userMessage, Double temperature) {
        if (!isAvailable()) {
            return null;
        }

        String primaryModel = config.getModel();
        if (primaryModel == null || primaryModel.isBlank()) {
            primaryModel = "gemini-1.5-flash";
        }

        // Try primary model, then fallback model if primary fails
        String result = callGemini(primaryModel, systemPrompt, history, userMessage, temperature);
        if (result == null && !primaryModel.equalsIgnoreCase("gemini-1.5-flash")) {
            log.warn("Gemini model {} failed, trying fallback gemini-1.5-flash", primaryModel);
            result = callGemini("gemini-1.5-flash", systemPrompt, history, userMessage, temperature);
        }

        return result;
    }

    private String callGemini(String modelName, String systemPrompt, List<AiChatMessageDto> history, String userMessage, Double temperature) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("x-goog-api-key", config.getGeminiApiKey());

            String payload = buildRequestBody(systemPrompt, history, userMessage, temperature);
            HttpEntity<String> entity = new HttpEntity<>(payload, headers);

            String endpoint = API_URL.formatted(modelName);
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return parseGeminiResponse(response.getBody());
            }
        } catch (Exception e) {
            log.warn("Gemini API call failed for model {}: {}", modelName, e.getMessage());
        }
        return null;
    }

    private String buildRequestBody(String systemPrompt, List<AiChatMessageDto> history, String userMessage, Double temperature) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();

        // 1. System Instruction
        if (systemPrompt != null && !systemPrompt.isBlank()) {
            ObjectNode instruction = root.putObject("system_instruction");
            ArrayNode parts = instruction.putArray("parts");
            parts.addObject().put("text", systemPrompt);
        }

        // 2. Contents (History + Current Prompt)
        ArrayNode contents = root.putArray("contents");

        if (history != null && !history.isEmpty()) {
            // Keep up to 6 recent turns to stay within token limits
            int start = Math.max(0, history.size() - 6);
            for (int i = start; i < history.size(); i++) {
                AiChatMessageDto msg = history.get(i);
                if (msg.getContent() == null || msg.getContent().isBlank()) continue;

                String role = "user";
                if ("assistant".equalsIgnoreCase(msg.getRole()) || "model".equalsIgnoreCase(msg.getRole())) {
                    role = "model";
                }

                ObjectNode turn = contents.addObject();
                turn.put("role", role);
                turn.putArray("parts").addObject().put("text", msg.getContent());
            }
        }

        // Current user message
        ObjectNode currentTurn = contents.addObject();
        currentTurn.put("role", "user");
        currentTurn.putArray("parts").addObject().put("text", userMessage);

        // 3. Generation Config
        double temp = (temperature != null && temperature >= 0.0 && temperature <= 1.0)
                ? temperature
                : config.getTemperature();
        int maxTokens = config.getMaxTokens() != null ? config.getMaxTokens() : 800;

        root.putObject("generationConfig")
                .put("temperature", temp)
                .put("maxOutputTokens", maxTokens);

        return objectMapper.writeValueAsString(root);
    }

    private String parseGeminiResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode parts = candidates.get(0).path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    return parts.get(0).path("text").asText("");
                }
            }
        } catch (Exception e) {
            log.error("Failed to parse Gemini response: {}", e.getMessage());
        }
        return null;
    }
}
