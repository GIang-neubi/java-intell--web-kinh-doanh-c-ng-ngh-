package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiChatResponse {
    private boolean success;
    private String message;
    @Builder.Default
    private List<ProductRecommendation> products = new ArrayList<>();
    private boolean authenticated;
    private String provider;

    public AiChatResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
        this.products = new ArrayList<>();
    }

    public AiChatResponse(boolean success, String message, List<ProductRecommendation> products) {
        this.success = success;
        this.message = message;
        this.products = products != null ? products : new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ProductRecommendation {
        private Long id;
        private String name;
        private String category;
        private String brand;
        private String description;
        private String specifications;
        private BigDecimal price;
        private BigDecimal salePrice;
        private Integer stock;
        private String image;
        private Integer discountPercent;
        private Double rating;
        private Integer reviewCount;
    }
}