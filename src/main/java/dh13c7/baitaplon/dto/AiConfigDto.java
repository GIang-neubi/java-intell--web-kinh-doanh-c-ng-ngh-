package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiConfigDto {
    private boolean enabled;
    private String provider;
    private String model;
    private Double temperature;
    private Integer maxTokens;
    private boolean hasApiKey;
    private String maskedApiKey;
    private String systemPromptCustom;
    private String statusMessage;
}
