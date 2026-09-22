package dh13c7.baitaplon.service;

import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.OrderStatus;
import dh13c7.baitaplon.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SePayPollingService {

    private final OrderRepository orderRepository;
    private final RestTemplate restTemplate;

    @Value("${sepay.polling.enabled:false}")
    private boolean pollingEnabled;

    @Value("${sepay.api.base-url:}")
    private String sepayApiBaseUrl;

    @Value("${sepay.api.key:}")
    private String sepayApiKey;

    @Value("${sepay.bank.short:MB}")
    private String bankShort;

    @Value("${sepay.bank.account:7690152904691}")
    private String bankAccount;

    @Scheduled(fixedRateString = "${sepay.polling.interval-ms:30000}")
    public void pollPendingOrders() {
        if (!pollingEnabled) {
            log.info("[SePayPoll] Disabled (set sepay.polling.enabled=true)");
            return;
        }
        if (sepayApiBaseUrl == null || sepayApiBaseUrl.isBlank()) {
            log.warn("[SePayPoll] No sepay.api.base-url configured");
            return;
        }

        log.info("[SePayPoll] === Poll started ===");
        List<Order> pendingOrders = orderRepository.findAll().stream()
                .filter(o -> "PENDING".equals(o.getPaymentStatus()))
                .toList();
        log.info("[SePayPoll] Found {} pending", pendingOrders.size());
        if (pendingOrders.isEmpty()) return;

        int confirmed = 0;
        int failed = 0;
        for (Order order : pendingOrders) {
            try {
                if (checkOrderPayment(order)) confirmed++;
            } catch (Exception e) {
                failed++;
                log.error("[SePayPoll] Error checking {}: {}", order.getOrderCode(), e.getMessage());
            }
        }
        log.info("[SePayPoll] === Poll done === confirmed={}, failed={}", confirmed, failed);
    }

    private boolean checkOrderPayment(Order order) {
        String transferContent = order.getTransferContent();
        log.info("[SePayPoll] Checking {} | content='{}'", order.getOrderCode(), transferContent);

        if (transferContent == null || transferContent.isBlank()) {
            return false;
        }

        String url = String.format("%s/api/account/transactions?account_number=%s&bank=%s",
                sepayApiBaseUrl, bankAccount, bankShort);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            if (sepayApiKey != null && !sepayApiKey.isBlank()) {
                headers.set("Authorization", "Apikey " + sepayApiKey);
            }
            HttpEntity<String> request = new HttpEntity<>(headers);

            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, request, Map.class);
            if (response.getStatusCode() != HttpStatus.OK || response.getBody() == null) {
                return false;
            }

            List<Map<String, Object>> transactions = extractTransactions(response.getBody());
            log.info("[SePayPoll] {} got {} transactions", order.getOrderCode(), transactions.size());

            for (Map<String, Object> txn : transactions) {
                String txnContent = (String) txn.getOrDefault("content", "");
                String txnAmountStr = String.valueOf(txn.getOrDefault("amount", "0"));
                String txnType = (String) txn.getOrDefault("type", "");

                log.info("[SePayPoll] {} txn: type='{}', content='{}', amount={}",
                        order.getOrderCode(), txnType, txnContent, txnAmountStr);

                if (isTransactionMatch(txnContent, txnAmountStr, txnType, order)) {
                    confirmPayment(order);
                    return true;
                }
            }
            return false;

        } catch (RestClientException e) {
            log.error("[SePayPoll] {} API error: {}", order.getOrderCode(), e.getMessage());
            return false;
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractTransactions(Map<String, Object> body) {
        Object data = body.get("data");
        if (data instanceof Map) {
            Object txns = ((Map<String, Object>) data).get("transactions");
            if (txns instanceof List) return (List<Map<String, Object>>) txns;
            Object items = ((Map<String, Object>) data).get("items");
            if (items instanceof List) return (List<Map<String, Object>>) items;
        }
        if (data instanceof List) return (List<Map<String, Object>>) data;
        Object txns = body.get("transactions");
        if (txns instanceof List) return (List<Map<String, Object>>) txns;
        Object items = body.get("items");
        if (items instanceof List) return (List<Map<String, Object>>) items;
        return List.of();
    }

    private boolean isTransactionMatch(String content, String amount, String type, Order order) {
        if (type != null && !"in".equalsIgnoreCase(type) && !"deposit".equalsIgnoreCase(type)) {
            return false;
        }

        String normalizedContent = normalize(content);
        String normalizedTC = normalize(order.getTransferContent());
        if (!normalizedContent.contains(normalizedTC)) return false;

        try {
            BigDecimal received = new BigDecimal(amount);
            BigDecimal diff = order.getTotalAmount().subtract(received).abs();
            return diff.compareTo(BigDecimal.valueOf(1000)) <= 0;
        } catch (NumberFormatException e) {
            return false;
        }
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
    }

    private void confirmPayment(Order order) {
        log.info("[SePayPoll] ✅ Confirming {} | amount={}", order.getOrderCode(), order.getTotalAmount());
        order.setPaymentStatus("PAID");
        if (order.getStatus() == OrderStatus.PENDING) {
            order.setStatus(OrderStatus.CONFIRMED);
        }
        orderRepository.save(order);
        log.info("[SePayPoll] ✅ {} is now PAID", order.getOrderCode());
    }
}
