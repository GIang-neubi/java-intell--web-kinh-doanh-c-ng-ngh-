package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.ApiResponse;
import dh13c7.baitaplon.dto.CreateReturnRequestDTO;
import dh13c7.baitaplon.dto.PageResponse;
import dh13c7.baitaplon.dto.ReturnRequestDTO;
import dh13c7.baitaplon.security.services.UserDetailsImpl;
import dh13c7.baitaplon.service.ReturnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/returns")
@RequiredArgsConstructor
public class ReturnController {

    private final ReturnService returnService;

    private Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserDetailsImpl userDetails) {
            return userDetails.getId();
        }
        throw new BadCredentialsException("Vui lòng đăng nhập.");
    }

    @PostMapping
    public ResponseEntity<ApiResponse<ReturnRequestDTO>> createReturnRequest(@RequestBody CreateReturnRequestDTO requestDTO) {
        ReturnRequestDTO result = returnService.createReturnRequest(getCurrentUserId(), requestDTO);
        return new ResponseEntity<>(new ApiResponse<>(true, "Tạo yêu cầu trả hàng thành công", result), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<ApiResponse<PageResponse<ReturnRequestDTO>>> getMyReturnRequests(
            @RequestParam(defaultValue = "0") int pageNo,
            @RequestParam(defaultValue = "10") int pageSize) {
        PageResponse<ReturnRequestDTO> result = returnService.getMyReturnRequests(getCurrentUserId(), pageNo, pageSize);
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy danh sách thành công", result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<ReturnRequestDTO>> getMyReturnRequestById(@PathVariable Long id) {
        ReturnRequestDTO result = returnService.getMyReturnRequestById(id, getCurrentUserId());
        return ResponseEntity.ok(new ApiResponse<>(true, "Lấy chi tiết thành công", result));
    }
}
