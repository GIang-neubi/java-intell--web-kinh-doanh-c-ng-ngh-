package dh13c7.baitaplon.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class BrandDTO {
    private Long id;

    @NotBlank(message = "Tên thương hiệu không được để trống")
    private String name;

    private String description;
    private String logo;
    private Long productCount;
}
