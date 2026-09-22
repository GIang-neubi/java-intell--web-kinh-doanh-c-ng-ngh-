package dh13c7.baitaplon.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ProductDeleteResult {
    private boolean softDeleted;
    private String message;
}
