package dh13c7.baitaplon.service.ai;

import dh13c7.baitaplon.dto.AiChatMessageDto;

import java.util.List;

/**
 * AI Provider abstraction — allows seamless switching between Gemini,
 * future LLM providers, and local deterministic fallback engine.
 */
public interface AiProvider {

    /**
     * Provider unique identifier (e.g. "gemini", "fallback", "openai")
     */
    String getProviderName();

    /**
     * Check whether provider is configured and available (e.g. API key present)
     */
    boolean isAvailable();

    /**
     * Generate response from LLM given system prompt, conversation history, and user message.
     *
     * @param systemPrompt Grounded system instruction containing verified DB facts
     * @param history Previous conversation turns
     * @param userMessage Current user prompt
     * @param temperature Sampling temperature
     * @return Generated text response or null if failed
     */
    String generateResponse(String systemPrompt, List<AiChatMessageDto> history, String userMessage, Double temperature);
}
