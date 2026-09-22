package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.AiChatRequest;
import dh13c7.baitaplon.dto.AiChatResponse;
import dh13c7.baitaplon.model.*;
import dh13c7.baitaplon.repository.CartRepository;
import dh13c7.baitaplon.repository.OrderRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.ReviewRepository;
import dh13c7.baitaplon.service.AIService;
import dh13c7.baitaplon.service.ai.AiConfigProperties;
import dh13c7.baitaplon.service.ai.FallbackAiEngine;
import dh13c7.baitaplon.service.ai.GeminiAiProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiServiceTest {

    @Mock private ProductRepository productRepository;
    @Mock private CartRepository cartRepository;
    @Mock private OrderRepository orderRepository;
    @Mock private ReviewRepository reviewRepository;
    @Mock private GeminiAiProvider geminiAiProvider;

    private AiConfigProperties aiConfig;
    private FallbackAiEngine fallbackAiEngine;
    private AIService aiService;

    private Product laptopAsus;
    private Product cameraSony;

    @BeforeEach
    void setUp() {
        aiConfig = new AiConfigProperties();
        fallbackAiEngine = new FallbackAiEngine(productRepository, cartRepository, orderRepository);
        aiService = new AIService(
                productRepository,
                cartRepository,
                orderRepository,
                reviewRepository,
                geminiAiProvider,
                fallbackAiEngine,
                aiConfig
        );

        Category catLaptop = Category.builder().id(1L).name("Laptop").build();
        Category catCamera = Category.builder().id(2L).name("Máy ảnh").build();
        Brand brandAsus = Brand.builder().id(1L).name("Asus").build();
        Brand brandSony = Brand.builder().id(2L).name("Sony").build();

        laptopAsus = Product.builder()
                .id(101L)
                .name("Laptop Asus ROG Zephyrus G16")
                .price(BigDecimal.valueOf(28000000))
                .salePrice(BigDecimal.valueOf(26500000))
                .stock(5)
                .status(true)
                .category(catLaptop)
                .brand(brandAsus)
                .specifications("Core i7, 16GB RAM, 512GB SSD, RTX 4060")
                .build();

        cameraSony = Product.builder()
                .id(102L)
                .name("Máy ảnh Sony Alpha A7 IV")
                .price(BigDecimal.valueOf(55000000))
                .salePrice(BigDecimal.valueOf(52000000))
                .stock(3)
                .status(true)
                .category(catCamera)
                .brand(brandSony)
                .specifications("33MP Full-Frame, 4K 60p, Dual Slot")
                .build();
    }

    @Test
    void testBudgetQuery_LaptopUnder30Million() {
        when(geminiAiProvider.isAvailable()).thenReturn(false); // Test fallback engine
        when(productRepository.findAll()).thenReturn(List.of(laptopAsus, cameraSony));

        AiChatRequest request = new AiChatRequest("Tìm laptop gaming dưới 30 triệu");
        AiChatResponse response = aiService.chat(request, null);

        assertTrue(response.isSuccess());
        assertNotNull(response.getMessage());
        assertTrue(response.getMessage().contains("26,500,000 đ") || response.getMessage().contains("ROG Zephyrus"));
        assertFalse(response.getProducts().isEmpty());
        assertEquals("Laptop Asus ROG Zephyrus G16", response.getProducts().get(0).getName());
    }

    @Test
    void testProductComparison_TwoProducts() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);
        when(productRepository.findAll()).thenReturn(List.of(laptopAsus, cameraSony));

        AiChatRequest request = new AiChatRequest("So sánh Asus ROG và Sony A7");
        AiChatResponse response = aiService.chat(request, null);

        assertTrue(response.isSuccess());
        assertTrue(response.getMessage().contains("| Tiêu chí |"));
        assertTrue(response.getMessage().contains("Asus ROG"));
        assertTrue(response.getMessage().contains("Sony Alpha"));
        assertEquals(2, response.getProducts().size());
    }

    @Test
    void testOrderInquiry_GuestUser_RequiresLogin() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);

        AiChatRequest request = new AiChatRequest("Đơn hàng của tôi đang ở trạng thái nào?");
        AiChatResponse response = aiService.chat(request, null); // guest user

        assertTrue(response.isSuccess());
        assertTrue(response.getMessage().contains("đăng nhập"));
    }

    @Test
    void testOrderInquiry_LoggedInUser_ReturnsRealOrderStatus() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);

        Long userId = 42L;
        Order mockOrder = Order.builder()
                .id(1L)
                .orderCode("HG-2026-9999")
                .totalAmount(BigDecimal.valueOf(26500000))
                .status(OrderStatus.SHIPPING)
                .paymentMethod(PaymentMethod.BANKING)
                .paymentStatus("PAID")
                .shippingAddress("123 Phố Huế, Hà Nội")
                .createdAt(LocalDateTime.now())
                .build();

        when(orderRepository.findByUserIdOrderByCreatedAtDesc(userId)).thenReturn(List.of(mockOrder));

        AiChatRequest request = new AiChatRequest("Kiểm tra đơn hàng của tôi");
        AiChatResponse response = aiService.chat(request, userId);

        assertTrue(response.isSuccess());
        assertTrue(response.getMessage().contains("HG-2026-9999"));
        assertTrue(response.getMessage().contains("Đang vận chuyển"));
        assertTrue(response.getMessage().contains("Đã thanh toán"));
    }

    @Test
    void testCartInquiry_LoggedInUser_ReturnsCartContents() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);

        Long userId = 42L;
        Cart cart = Cart.builder()
                .id(1L)
                .items(List.of(
                        CartItem.builder().id(1L).product(laptopAsus).quantity(1).build()
                ))
                .build();

        when(cartRepository.findByUserId(userId)).thenReturn(Optional.of(cart));

        AiChatRequest request = new AiChatRequest("Giỏ hàng của tôi có gì?");
        AiChatResponse response = aiService.chat(request, userId);

        assertTrue(response.isSuccess());
        assertTrue(response.getMessage().contains("Laptop Asus ROG Zephyrus G16"));
        assertTrue(response.getMessage().contains("26,500,000 đ"));
    }

    @Test
    void testStorePolicy_PaymentInfo() {
        when(geminiAiProvider.isAvailable()).thenReturn(false);

        AiChatRequest request = new AiChatRequest("H&G hỗ trợ thanh toán như thế nào?");
        AiChatResponse response = aiService.chat(request, null);

        assertTrue(response.isSuccess());
        assertTrue(response.getMessage().contains("SePay"));
        assertTrue(response.getMessage().contains("MB Bank"));
        assertTrue(response.getMessage().contains("7690152904691"));
        assertTrue(response.getMessage().contains("COD"));
    }
}
