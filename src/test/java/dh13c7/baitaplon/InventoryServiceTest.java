package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.InventoryImportItemRequest;
import dh13c7.baitaplon.dto.InventoryImportRequest;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.model.InventoryLog;
import dh13c7.baitaplon.model.Product;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.InventoryLogRepository;
import dh13c7.baitaplon.repository.ProductRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.impl.InventoryServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("InventoryService Unit Tests")
class InventoryServiceTest {

    @Mock
    private InventoryLogRepository inventoryLogRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private InventoryServiceImpl inventoryService;

    private User adminUser;
    private Product product;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(1L)
                .username("admin")
                .email("admin@hg.com")
                .password("encoded_pass")
                .fullName("Admin HG")
                .role(Role.ROLE_ADMIN)
                .enabled(true)
                .build();

        product = Product.builder()
                .id(10L)
                .name("Canon EOS R50")
                .price(new BigDecimal("15000000"))
                .stock(20)
                .status(true)
                .build();
    }

    @Test
    @DisplayName("Nhập kho thành công: stock phải được cộng đúng số lượng")
    void importInventory_success_shouldIncreaseStock() {
        // Arrange
        InventoryImportItemRequest item = new InventoryImportItemRequest();
        item.setProductId(10L);
        item.setQuantity(50);
        item.setNote("Lô hàng tháng 10");

        InventoryImportRequest request = new InventoryImportRequest();
        request.setItems(List.of(item));
        request.setGeneralNote("Nhập kho tổng");

        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(productRepository.findById(10L)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));
        when(inventoryLogRepository.save(any(InventoryLog.class))).thenAnswer(inv -> inv.getArgument(0));

        // Act
        inventoryService.importInventory(request, 1L);

        // Assert: stock phải tăng từ 20 lên 70
        assertThat(product.getStock()).isEqualTo(70);
        verify(productRepository, times(1)).save(product);
        verify(inventoryLogRepository, times(1)).save(any(InventoryLog.class));
    }

    @Test
    @DisplayName("Nhập kho thất bại: user không tồn tại phải throw BadRequestException")
    void importInventory_unknownUser_shouldThrow() {
        // Arrange
        InventoryImportRequest request = new InventoryImportRequest();
        request.setItems(List.of());

        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> inventoryService.importInventory(request, 999L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không tìm thấy người dùng");

        verify(productRepository, never()).save(any());
        verify(inventoryLogRepository, never()).save(any());
    }

    @Test
    @DisplayName("Nhập kho thất bại: sản phẩm không tồn tại phải throw BadRequestException")
    void importInventory_unknownProduct_shouldThrow() {
        // Arrange
        InventoryImportItemRequest item = new InventoryImportItemRequest();
        item.setProductId(999L);
        item.setQuantity(10);

        InventoryImportRequest request = new InventoryImportRequest();
        request.setItems(List.of(item));

        when(userRepository.findById(1L)).thenReturn(Optional.of(adminUser));
        when(productRepository.findById(999L)).thenReturn(Optional.empty());

        // Act + Assert
        assertThatThrownBy(() -> inventoryService.importInventory(request, 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ID: 999");
    }
}
