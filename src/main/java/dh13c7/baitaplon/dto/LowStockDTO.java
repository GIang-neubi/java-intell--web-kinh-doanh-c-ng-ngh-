package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LowStockDTO {
    private Long id;
    private String name;
    private String image;
    private Integer stock;
    private String categoryName;
}
