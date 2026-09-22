package dh13c7.baitaplon.service.ai;

import dh13c7.baitaplon.model.Cart;
import dh13c7.baitaplon.model.CartItem;
import dh13c7.baitaplon.model.Order;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.repository.CartRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Slf4j
@Component
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class FallbackAiEngine {

    private final ProductRepository productRepository;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;

    private String getCategoryNameSafe(Product p) {
        try {
            return (p != null && p.getCategory() != null) ? p.getCategory().getName() : "";
        } catch (Exception e) {
            return "";
        }
    }

    private String getBrandNameSafe(Product p) {
        try {
            return (p != null && p.getBrand() != null) ? p.getBrand().getName() : "";
        } catch (Exception e) {
            return "";
        }
    }

    @Data
    @Builder
    public static class FallbackResult {
        private String message;
        @Builder.Default
        private List<Product> matchedProducts = new ArrayList<>();
    }

    public FallbackResult processQuery(String rawMessage, Long currentUserId) {
        String normalized = normalize(rawMessage);

        // 1. Order Status & History Inquiry
        if (isOrderInquiry(normalized)) {
            return handleOrderInquiry(currentUserId, normalized);
        }

        // 2. Cart Inquiry
        if (isCartInquiry(normalized)) {
            return handleCartInquiry(currentUserId);
        }

        // 3. Store FAQ / Policy Inquiries (Payment, Return, Shipping)
        if (isPolicyInquiry(normalized)) {
            return handlePolicyInquiry(normalized);
        }

        // 4. Product Comparison Inquiry
        if (isComparisonInquiry(normalized)) {
            return handleComparisonInquiry(rawMessage, normalized);
        }

        // 5. In-stock Inquiry
        if (isInStockInquiry(normalized)) {
            return handleInStockInquiry();
        }

        // 6. Budget-based & Category Search (e.g. "laptop dưới 30 triệu")
        BigDecimal budget = extractBudget(normalized);
        if (budget != null || containsCategoryKeyword(normalized)) {
            return handleBudgetAndCategorySearch(normalized, budget);
        }

        // 7. General Product Search by keyword / brand
        FallbackResult searchResult = handleKeywordSearch(normalized);
        if (!searchResult.getMatchedProducts().isEmpty()) {
            return searchResult;
        }

        // 8. Default Greeting / Guidance
        return FallbackResult.builder()
                .message("Chào bạn! Mình là H&G Assistant — trợ lý mua sắm công nghệ & máy ảnh của H&G.\n\n" +
                        "Mình có thể giúp bạn:\n" +
                        "• Tìm sản phẩm theo ngân sách (ví dụ: *\"Laptop gaming dưới 30 triệu\"*)\n" +
                        "• Tư vấn chọn máy ảnh, ống kính hoặc laptop học tập, đồ họa\n" +
                        "• So sánh cấu hình 2 sản phẩm\n" +
                        "• Kiểm tra giỏ hàng và trạng thái đơn hàng của bạn\n" +
                        "• Hướng dẫn thanh toán qua mã QR SePay hoặc chính sách đổi trả\n\n" +
                        "Bạn đang quan tâm đến sản phẩm nào?")
                .matchedProducts(Collections.emptyList())
                .build();
    }

    private boolean isOrderInquiry(String text) {
        return text.contains("don hang") || text.contains("kiem tra don") || text.contains("trang thai don")
                || text.contains("tra cuu don") || text.contains("don cua toi") || text.contains("order");
    }

    private FallbackResult handleOrderInquiry(Long userId, String text) {
        if (userId == null) {
            return FallbackResult.builder()
                    .message("Bạn vui lòng **đăng nhập** vào tài khoản H&G để mình có thể tra cứu đơn hàng của bạn nhé! Sau khi đăng nhập, bạn có thể hỏi mình bất cứ lúc nào.")
                    .build();
        }

        List<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId);
        if (orders.isEmpty()) {
            return FallbackResult.builder()
                    .message("Hiện tại tài khoản của bạn chưa có đơn hàng nào trên H&G. Bạn có thể dạo xem các sản phẩm máy ảnh, laptop chính hãng để chọn món đồ yêu thích nhé!")
                    .build();
        }

        // Check if user asked about a specific order code
        Pattern codePattern = Pattern.compile("([A-Za-z0-9_-]{5,})");
        Matcher matcher = codePattern.matcher(text);
        Order targetOrder = null;
        while (matcher.find()) {
            String candidate = matcher.group(1).toUpperCase(Locale.ROOT);
            for (Order o : orders) {
                if (o.getOrderCode().toUpperCase(Locale.ROOT).contains(candidate)) {
                    targetOrder = o;
                    break;
                }
            }
            if (targetOrder != null) break;
        }

        if (targetOrder == null) {
            targetOrder = orders.get(0); // Latest order
        }

        String statusVi = translateOrderStatus(targetOrder.getStatus() != null ? targetOrder.getStatus().name() : "");
        String paymentVi = "PAID".equalsIgnoreCase(targetOrder.getPaymentStatus()) ? "Đã thanh toán" : "Chưa thanh toán (Chờ thanh toán / COD)";
        String dateStr = targetOrder.getCreatedAt() != null
                ? targetOrder.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"))
                : "Gần đây";

        String msg = String.format(
                "Thông tin đơn hàng gần nhất của bạn tại H&G:\n\n" +
                "• **Mã đơn hàng**: `%s`\n" +
                "• **Ngày đặt**: %s\n" +
                "• **Tổng tiền**: %,.0f đ\n" +
                "• **Trạng thái**: %s\n" +
                "• **Phương thức**: %s (%s)\n" +
                "• **Địa chỉ giao hàng**: %s\n\n" +
                "Bạn có thể xem chi tiết tất cả đơn hàng tại mục **Tài khoản > Đơn hàng** trên hệ thống.",
                targetOrder.getOrderCode(),
                dateStr,
                targetOrder.getTotalAmount().doubleValue(),
                statusVi,
                targetOrder.getPaymentMethod(),
                paymentVi,
                targetOrder.getShippingAddress() != null ? targetOrder.getShippingAddress() : "Theo hồ sơ"
        );

        return FallbackResult.builder().message(msg).build();
    }

    private boolean isCartInquiry(String text) {
        return text.contains("gio hang") || text.contains("cart") || text.contains("trong gio");
    }

    private FallbackResult handleCartInquiry(Long userId) {
        if (userId == null) {
            return FallbackResult.builder()
                    .message("Bạn hãy **đăng nhập** để mình kiểm tra đồng bộ giỏ hàng cho bạn nhé. Nếu bạn đang thêm hàng trên trình duyệt này, bạn cũng có thể bấm vào biểu tượng Giỏ hàng ở góc phải màn hình.")
                    .build();
        }

        Optional<Cart> cartOpt = cartRepository.findByUserId(userId);
        if (cartOpt.isEmpty() || cartOpt.get().getItems().isEmpty()) {
            return FallbackResult.builder()
                    .message("Giỏ hàng của bạn tại H&G hiện đang trống. Hãy khám phá danh mục sản phẩm của H&G để thêm các sản phẩm ưng ý nhé!")
                    .build();
        }

        Cart cart = cartOpt.get();
        List<CartItem> items = cart.getItems();
        double total = items.stream().mapToDouble(i -> {
            BigDecimal price = i.getProduct().getSalePrice() != null ? i.getProduct().getSalePrice() : i.getProduct().getPrice();
            return price.doubleValue() * i.getQuantity();
        }).sum();

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("Giỏ hàng của bạn đang có **%d món hàng** (Tổng cộng: **%,.0f đ**):\n\n", items.size(), total));
        for (CartItem item : items) {
            BigDecimal price = item.getProduct().getSalePrice() != null ? item.getProduct().getSalePrice() : item.getProduct().getPrice();
            sb.append(String.format("• **%s** x %d — %,.0f đ\n", item.getProduct().getName(), item.getQuantity(), price.doubleValue() * item.getQuantity()));
        }
        sb.append("\nBạn có thể vào giỏ hàng để tiến hành thanh toán hoặc hỏi mình tư vấn thêm phụ kiện phù hợp!");

        List<Product> products = items.stream().map(CartItem::getProduct).limit(3).toList();
        return FallbackResult.builder().message(sb.toString()).matchedProducts(products).build();
    }

    private boolean isPolicyInquiry(String text) {
        return text.contains("thanh toan") || text.contains("sepay") || text.contains("chuyen khoan") ||
                text.contains("doi tra") || text.contains("bao hanh") || text.contains("giao hang") ||
                text.contains("van chuyen") || text.contains("dia chi") || text.contains("showroom");
    }

    private FallbackResult handlePolicyInquiry(String text) {
        if (text.contains("thanh toan") || text.contains("sepay") || text.contains("chuyen khoan")) {
            return FallbackResult.builder()
                    .message("H&G hỗ trợ **2 hình thức thanh toán** thuận tiện & an toàn:\n\n" +
                            "1. **Thanh toán chuyển khoản qua mã QR SePay (Khuyên dùng)**:\n" +
                            "   • Ngân hàng: **MB Bank (Quân Đội)**\n" +
                            "   • Số tài khoản: `7690152904691`\n" +
                            "   • Tên chủ tài khoản: `NGUYEN TRUONG GIANG`\n" +
                            "   • Hệ thống tự động quét và xác nhận thanh toán chỉ sau 3–5 giây!\n\n" +
                            "2. **Thanh toán khi nhận hàng (COD)**: Nhận hàng, kiểm tra sản phẩm trước khi thanh toán tiền mặt cho bưu tá.")
                    .build();
        }

        if (text.contains("doi tra") || text.contains("bao hanh")) {
            return FallbackResult.builder()
                    .message("Chính sách bảo hành & đổi trả tại H&G:\n\n" +
                            "• **Đổi mới 1 - 1 trong 7 ngày** đầu nếu sản phẩm có lỗi kỹ thuật từ nhà sản xuất.\n" +
                            "• **Bảo hành chính hãng 12 - 24 tháng** toàn diện theo tiêu chuẩn của hãng (Sony, Canon, Fujifilm, Apple, Asus...).\n" +
                            "• Hỗ trợ kỹ thuật, vệ sinh máy và cân chỉnh thiết bị trọn đời tại showroom H&G.")
                    .build();
        }

        return FallbackResult.builder()
                .message("Chính sách giao nhận tại H&G:\n\n" +
                        "• **Giao hàng toàn quốc**: Thời gian giao từ 2 – 4 ngày làm việc.\n" +
                        "• **Bảo hiểm hàng hóa 100%**: Tất cả máy ảnh, laptop và linh kiện đều được niêm phong chống sốc và bảo hiểm trọn vẹn.\n" +
                        "• **Kiểm tra hàng trước khi thanh toán**: Quý khách có quyền đồng kiểm tra ngoại quan cùng bưu tá trước khi nhận hàng.")
                .build();
    }

    private boolean isComparisonInquiry(String text) {
        return text.contains("so sanh") || text.contains("khac gi") || text.contains("nen mua") || text.contains("vs");
    }

    private FallbackResult handleComparisonInquiry(String rawMessage, String text) {
        List<Product> allProducts = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getStatus()))
                .toList();

        // Find products mentioned in query
        List<Product> found = new ArrayList<>();
        for (Product p : allProducts) {
            String pName = normalize(p.getName());
            // Match if name or substantial part appears
            if (text.contains(pName) || matchesKeywords(pName, text)) {
                if (!found.contains(p)) found.add(p);
            }
            if (found.size() >= 3) break;
        }

        if (found.size() < 2) {
            // Fallback: pick 2 top products from active list
            found = allProducts.stream().limit(2).toList();
        }

        if (found.size() < 2) {
            return FallbackResult.builder()
                    .message("Hệ thống chưa tìm thấy đủ 2 sản phẩm để so sánh. Bạn hãy thử nhập tên 2 sản phẩm cụ thể (ví dụ: *\"So sánh Sony và Canon\"*) nhé!")
                    .build();
        }

        Product p1 = found.get(0);
        Product p2 = found.get(1);

        String p1Price = formatPrice(p1.getSalePrice() != null ? p1.getSalePrice() : p1.getPrice());
        String p2Price = formatPrice(p2.getSalePrice() != null ? p2.getSalePrice() : p2.getPrice());

        String p1Stock = (p1.getStock() != null && p1.getStock() > 0) ? "Còn hàng (" + p1.getStock() + ")" : "Tạm hết hàng";
        String p2Stock = (p2.getStock() != null && p2.getStock() > 0) ? "Còn hàng (" + p2.getStock() + ")" : "Tạm hết hàng";

        String p1Spec = (p1.getSpecifications() != null && !p1.getSpecifications().isBlank()) ? p1.getSpecifications() : "Theo thông số nhà SX";
        String p2Spec = (p2.getSpecifications() != null && !p2.getSpecifications().isBlank()) ? p2.getSpecifications() : "Theo thông số nhà SX";

        String table = String.format(
                "Dưới đây là bảng so sánh chi tiết dựa trên dữ liệu thực tế tại H&G:\n\n" +
                "| Tiêu chí | %s | %s |\n" +
                "| :--- | :--- | :--- |\n" +
                "| **Giá bán** | %s | %s |\n" +
                "| **Thương hiệu** | %s | %s |\n" +
                "| **Danh mục** | %s | %s |\n" +
                "| **Tình trạng kho** | %s | %s |\n" +
                "| **Thông số chính** | %s | %s |\n\n" +
                "Cả hai sản phẩm đều được bảo hành chính hãng tại H&G. Bạn có thể bấm vào thẻ sản phẩm bên dưới để xem hình ảnh và đặt mua nhé!",
                p1.getName(), p2.getName(),
                p1Price, p2Price,
                getBrandNameSafe(p1).isBlank() ? "N/A" : getBrandNameSafe(p1),
                getBrandNameSafe(p2).isBlank() ? "N/A" : getBrandNameSafe(p2),
                getCategoryNameSafe(p1).isBlank() ? "N/A" : getCategoryNameSafe(p1),
                getCategoryNameSafe(p2).isBlank() ? "N/A" : getCategoryNameSafe(p2),
                p1Stock, p2Stock,
                truncate(p1Spec, 60), truncate(p2Spec, 60)
        );

        return FallbackResult.builder()
                .message(table)
                .matchedProducts(List.of(p1, p2))
                .build();
    }

    private boolean isInStockInquiry(String text) {
        return text.contains("con hang") || text.contains("san pham nao con") || text.contains("san co");
    }

    private FallbackResult handleInStockInquiry() {
        List<Product> inStock = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getStatus()) && p.getStock() != null && p.getStock() > 0)
                .sorted(Comparator.comparing(Product::getStock).reversed())
                .limit(4)
                .toList();

        if (inStock.isEmpty()) {
            return FallbackResult.builder()
                    .message("Hiện tại các mặt hàng đang tạm hết. Bạn có thể để lại liên hệ để H&G thông báo ngay khi có hàng về nhé.")
                    .build();
        }

        StringBuilder sb = new StringBuilder("Các sản phẩm đang **sẵn hàng** tại H&G sẵn sàng giao ngay:\n\n");
        for (Product p : inStock) {
            BigDecimal price = p.getSalePrice() != null ? p.getSalePrice() : p.getPrice();
            sb.append(String.format("• **%s** — %,.0f đ (Còn %d sản phẩm)\n", p.getName(), price.doubleValue(), p.getStock()));
        }
        sb.append("\nBạn muốn tìm hiểu kỹ hơn về dòng máy nào?");

        return FallbackResult.builder()
                .message(sb.toString())
                .matchedProducts(inStock)
                .build();
    }

    private FallbackResult handleBudgetAndCategorySearch(String text, BigDecimal budget) {
        List<Product> list = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getStatus()))
                .filter(p -> {
                    if (budget != null) {
                        BigDecimal pPrice = p.getSalePrice() != null ? p.getSalePrice() : p.getPrice();
                        if (pPrice.compareTo(budget) > 0) return false;
                    }
                    if (containsCategoryKeyword(text)) {
                        String catName = normalize(getCategoryNameSafe(p));
                        String prodName = normalize(p.getName());
                        if (text.contains("laptop") && !(catName.contains("laptop") || prodName.contains("laptop"))) return false;
                        if ((text.contains("camera") || text.contains("may anh")) && !(catName.contains("camera") || catName.contains("may anh") || prodName.contains("camera") || prodName.contains("may anh") || prodName.contains("sony") || prodName.contains("canon"))) return false;
                        if (text.contains("ong kinh") || text.contains("lens")) {
                            if (!(catName.contains("lens") || catName.contains("ong kinh") || prodName.contains("lens") || prodName.contains("f/"))) return false;
                        }
                    }
                    return true;
                })
                .sorted(Comparator.comparing(p -> (p.getSalePrice() != null ? p.getSalePrice() : p.getPrice()), Comparator.reverseOrder()))
                .limit(4)
                .toList();

        if (list.isEmpty()) {
            return FallbackResult.builder()
                    .message("Rất tiếc, H&G chưa tìm thấy sản phẩm nào khớp hoàn toàn với mức ngân sách này. Bạn có thể thử điều chỉnh mức ngân sách hoặc xem qua các sản phẩm nổi bật dưới đây:")
                    .matchedProducts(productRepository.findAll().stream().filter(p -> Boolean.TRUE.equals(p.getStatus())).limit(3).toList())
                    .build();
        }

        StringBuilder sb = new StringBuilder();
        if (budget != null) {
            sb.append(String.format("Dưới đây là các lựa chọn phù hợp nhất trong tầm giá dưới **%,.0f đ** tại H&G:\n\n", budget.doubleValue()));
        } else {
            sb.append("Dưới đây là các sản phẩm phù hợp với nhu cầu của bạn tại H&G:\n\n");
        }

        for (Product p : list) {
            BigDecimal price = p.getSalePrice() != null ? p.getSalePrice() : p.getPrice();
            String stockStr = (p.getStock() != null && p.getStock() > 0) ? "Còn hàng" : "Hết hàng";
            sb.append(String.format("• **%s** — %,.0f đ *(%s)*\n", p.getName(), price.doubleValue(), stockStr));
            if (p.getSpecifications() != null && !p.getSpecifications().isBlank()) {
                sb.append(String.format("   ↳ *%s*\n", truncate(p.getSpecifications(), 80)));
            }
        }
        sb.append("\nBạn có thể bấm **Thêm vào giỏ** hoặc **Xem chi tiết** ngay trên từng thẻ sản phẩm bên dưới.");

        return FallbackResult.builder()
                .message(sb.toString())
                .matchedProducts(list)
                .build();
    }

    private FallbackResult handleKeywordSearch(String text) {
        List<Product> matches = productRepository.findAll().stream()
                .filter(p -> Boolean.TRUE.equals(p.getStatus()))
                .filter(p -> {
                    String name = normalize(p.getName());
                    String brand = normalize(getBrandNameSafe(p));
                    String cat = normalize(getCategoryNameSafe(p));
                    return name.contains(text) || brand.contains(text) || cat.contains(text)
                            || Arrays.stream(text.split(" ")).filter(w -> w.length() > 2).anyMatch(w -> name.contains(w) || brand.contains(w));
                })
                .limit(3)
                .toList();

        if (matches.isEmpty()) {
            return FallbackResult.builder().matchedProducts(Collections.emptyList()).build();
        }

        StringBuilder sb = new StringBuilder("Gợi ý các sản phẩm phù hợp với tìm kiếm của bạn:\n\n");
        for (Product p : matches) {
            BigDecimal price = p.getSalePrice() != null ? p.getSalePrice() : p.getPrice();
            sb.append(String.format("• **%s** — %,.0f đ (Kho: %d)\n", p.getName(), price.doubleValue(), p.getStock()));
        }
        sb.append("\nBạn muốn xem chi tiết thông số hay so sánh sản phẩm nào?");

        return FallbackResult.builder()
                .message(sb.toString())
                .matchedProducts(matches)
                .build();
    }

    private BigDecimal extractBudget(String text) {
        // e.g. "30 trieu", "30tr", "30m", "20.000.000", "20000000"
        Pattern p1 = Pattern.compile("(\\d+([.,]\\d+)?)\\s*(trieu|tr|m)");
        Matcher m1 = p1.matcher(text);
        if (m1.find()) {
            try {
                double val = Double.parseDouble(m1.group(1).replace(",", "."));
                return BigDecimal.valueOf((long) (val * 1_000_000));
            } catch (Exception ignored) {}
        }

        Pattern p2 = Pattern.compile("(\\d{7,10})");
        Matcher m2 = p2.matcher(text.replace(".", "").replace(",", ""));
        if (m2.find()) {
            try {
                return new BigDecimal(m2.group(1));
            } catch (Exception ignored) {}
        }
        return null;
    }

    private boolean containsCategoryKeyword(String text) {
        return text.contains("laptop") || text.contains("may anh") || text.contains("camera")
                || text.contains("ong kinh") || text.contains("lens") || text.contains("phu kien")
                || text.contains("gaming") || text.contains("hoc it") || text.contains("do hoa");
    }

    private boolean matchesKeywords(String pName, String text) {
        String[] words = pName.split("\\s+");
        int matches = 0;
        for (String w : words) {
            if (w.length() > 2 && text.contains(w)) {
                matches++;
            }
        }
        return matches >= 2;
    }

    private String translateOrderStatus(String status) {
        return switch (status) {
            case "PENDING" -> "Đang chờ xác nhận";
            case "CONFIRMED" -> "Đã xác nhận";
            case "PROCESSING" -> "Đang chuẩn bị hàng";
            case "SHIPPING" -> "Đang vận chuyển giao hàng";
            case "DELIVERED" -> "Đã giao hàng thành công";
            case "CANCELLED" -> "Đã hủy";
            default -> status;
        };
    }

    private String formatPrice(BigDecimal price) {
        if (price == null) return "0 đ";
        return String.format("%,.0f đ", price.doubleValue());
    }

    private String truncate(String text, int max) {
        if (text == null) return "";
        return text.length() <= max ? text : text.substring(0, max) + "...";
    }

    private String normalize(String value) {
        if (value == null) return "";
        return Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'd')
                .toLowerCase(Locale.ROOT)
                .trim();
    }
}
