package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.AiConfigDto;
import dh13c7.baitaplon.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/ai")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAIController {

    private final AIService aiService;

    @GetMapping("/config")
    public ResponseEntity<ApiResponse<AiConfigDto>> getAiConfig() {
        AiConfigDto config = aiService.getAdminConfig();
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy cấu hình AI thành công", config));
    }

    @PutMapping("/config")
    public ResponseEntity<ApiResponse<AiConfigDto>> updateAiConfig(@RequestBody AiConfigDto request) {
        AiConfigDto updated = aiService.updateAdminConfig(request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Cập nhật cấu hình AI thành công", updated));
    }
}
