package dh13c7.baitaplon.Controller;

import dh13c7.baitaplon.dto.SePayWebhookDTO;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Nhận webhook từ SePay khi có giao dịch ngân hàng.
 *
 * Các URL được hỗ trợ (tất cả đều dùng cùng handler):
 *   POST /api/webhook/sepay     ← chuẩn
 *   POST /webhook/sepay         ← alias
 *   POST /sepay/webhook         ← alias (URL SePay đang dùng theo ngrok log)
 *   POST /api/sepay/webhook     ← alias
 *
 * Security: đã được permitAll() trong WebSecurityConfig.
 * Auth bằng Apikey header — nếu chưa cấu hình secret thì tự bypass để test.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class SePayWebhookController {

    private final OrderRepository orderRepository;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private dh13c7.baitaplon.service.NotificationService notificationService;

    @Value("${sepay.webhook.secret:HG_SEPAY_SECRET_2026}")
    private String webhookSecret;

    // ── Tất cả các URL alias ───────────────────────────────────────────────
    @PostMapping({
        "/api/webhook/sepay",
        "/webhook/sepay",
        "/sepay/webhook",
        "/api/sepay/webhook"
    })
    @Transactional
    public ResponseEntity<Map<String, Object>> handleSePay(
            @RequestHeader(value = "Authorization",  required = false) String authHeader,
            @RequestHeader(value = "X-API-Key",      required = false) String xApiKey,
            @RequestHeader(value = "x-api-key",      required = false) String xApiKeyLower,
            @RequestHeader(value = "API-Key",        required = false) String apiKeyHeader,
            @RequestHeader Map<String, String> allHeaders,
            @RequestBody SePayWebhookDTO payload
    ) {
        Map<String, Object> response = new HashMap<>();

        // ── LOG đầy đủ ────────────────────────────────────────────────────
        log.info("=== SePay Webhook ===  amount={} | content='{}' | type={}",
                payload.getTransferAmount(), payload.getContent(), payload.getTransferType());
        log.info("  Headers nhận được: {}", allHeaders);

        // ── Auth check ────────────────────────────────────────────────────
        String providedKey = extractApiKey(authHeader, xApiKey, xApiKeyLower, apiKeyHeader);
        log.info("  Secret config='{}' | Key được gửi='{}'", webhookSecret, providedKey);

        // Nếu secret vẫn là giá trị mặc định → bypass (chế độ test)
        boolean isDefaultSecret = "HG_SEPAY_SECRET_2026".equals(webhookSecret.trim())
                               || "REPLACE_WITH_YOUR_SEPAY_API_KEY".equals(webhookSecret.trim());
        if (!isDefaultSecret) {
            // Secret đã cấu hình → kiểm tra nghiêm ngặt
            if (providedKey == null || !providedKey.equals(webhookSecret.trim())) {
                log.warn("  AUTH FAILED — expected='{}' got='{}'", webhookSecret, providedKey);
                return ResponseEntity.status(401).body(Map.of(
                        "success", false, "message", "Unauthorized"));
            }
        } else {
            log.warn("  AUTH BYPASS (secret chưa cấu hình) — hãy đặt sepay.webhook.secret!");
        }

        // ── Chỉ xử lý tiền VÀO ────────────────────────────────────────────
        if (!"in".equalsIgnoreCase(payload.getTransferType())) {
            log.info("  Bỏ qua: giao dịch tiền ra");
            return ResponseEntity.ok(Map.of("success", true, "message", "Ignored outgoing"));
        }

        // ── Nội dung chuyển khoản ─────────────────────────────────────────
        String content = payload.getContent();
        if (content == null || content.isBlank()) {
            log.warn("  Content rỗng");
            return ResponseEntity.ok(Map.of("success", false, "message", "Empty content"));
        }

        // ── Tìm đơn hàng đang PENDING khớp nội dung CK ───────────────────
        List<Order> pendingOrders = orderRepository
                .findAllByOrderByCreatedAtDesc(PageRequest.of(0, 200))
                .stream()
                .filter(o -> "PENDING".equals(o.getPaymentStatus()))
                .toList();

        log.info("  Pending orders: {} | Content cần match: '{}'", pendingOrders.size(), content);

        String normalizedContent = normalize(content);
        Order matched = null;
        for (Order o : pendingOrders) {
            if (o.getTransferContent() == null) continue;
            String normalizedTC = normalize(o.getTransferContent());
            log.debug("    So sánh: '{}' contains '{}' = {}",
                    normalizedContent, normalizedTC, normalizedContent.contains(normalizedTC));
            if (normalizedContent.contains(normalizedTC)) {
                matched = o;
                break;
            }
        }

        if (matched == null) {
            log.warn("  Không tìm thấy đơn hàng khớp với content='{}'", content);
            return ResponseEntity.ok(Map.of("success", false, "message", "No matching order: " + content));
        }

        log.info("  MATCH: orderCode={} | transferContent='{}'",
                matched.getOrderCode(), matched.getTransferContent());

        // ── Kiểm tra số tiền (chấp nhận ±1000đ) ──────────────────────────
        BigDecimal expected = matched.getTotalAmount();
        BigDecimal received = payload.getTransferAmount().abs();
        BigDecimal diff     = expected.subtract(received).abs();

        if (diff.compareTo(BigDecimal.valueOf(1000)) > 0) {
            log.warn("  Số tiền lệch: expected={} received={} diff={}", expected, received, diff);
            // Vẫn ghi nhận — admin xử lý thủ công
            matched.setPaymentStatus("PARTIAL");
            orderRepository.save(matched);
            return ResponseEntity.ok(Map.of("success", true, "message",
                    "Partial: expected " + expected + " but got " + received));
        }

        // ── XÁC NHẬN THÀNH CÔNG ───────────────────────────────────────────
        log.info("  ✅ PAID: order {} | amount={}", matched.getOrderCode(), received);
        matched.setPaymentStatus("PAID");
        if (matched.getStatus() == OrderStatus.PENDING) {
            matched.setStatus(OrderStatus.CONFIRMED);
        }
        Order saved = orderRepository.save(matched);

        if (notificationService != null) {
            try {
                if (saved.getUser() != null) {
                    notificationService.sendNotification(
                            saved.getUser().getId(),
                            "Thanh toán thành công!",
                            "Đơn hàng #" + saved.getOrderCode() + " đã được xác nhận thanh toán thành công qua chuyển khoản.",
                            "PAYMENT",
                            "/orders/" + saved.getId()
                    );
                }
                notificationService.notifyAdmins(
                        "Thanh toán thành công #" + saved.getOrderCode(),
                        "Đơn hàng #" + saved.getOrderCode() + " đã nhận thanh toán " + received + " VND qua SePay.",
                        "PAYMENT",
                        "/admin/orders/" + saved.getId()
                );
            } catch (Exception e) {
                log.warn("Lỗi gửi thông báo thanh toán SePay: {}", e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Payment confirmed: " + matched.getOrderCode(),
                "orderCode", matched.getOrderCode()
        ));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private String extractApiKey(String authorization, String... others) {
        if (authorization != null && !authorization.isBlank()) {
            String v = authorization.trim();
            if (v.regionMatches(true, 0, "Apikey ", 0, 7))  return v.substring(7).trim();
            if (v.regionMatches(true, 0, "Bearer ", 0, 7))  return v.substring(7).trim();
            return v;
        }
        for (String h : others) {
            if (h != null && !h.isBlank()) return h.trim();
        }
        return null;
    }

    /** Xóa ký tự không phải chữ/số, uppercase — để so khớp linh hoạt */
    private String normalize(String s) {
        return s.replaceAll("[^A-Za-z0-9]", "").toUpperCase(Locale.ROOT);
    }
}
