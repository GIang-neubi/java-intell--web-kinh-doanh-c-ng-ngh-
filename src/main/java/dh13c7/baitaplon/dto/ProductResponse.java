package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductResponse {
    private Long id;
    private String name;
    private String description;
    private String specifications;
    private BigDecimal price;
    private BigDecimal salePrice;
    private Integer stock;
    private BigDecimal weightKg;
    private String image;
    private Boolean status;
    private Long categoryId;
    private String categoryName;
    private Long brandId;
    private String brandName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
