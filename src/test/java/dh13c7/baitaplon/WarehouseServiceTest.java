package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.warehouse.WarehouseDetailResponse;
import dh13c7.baitaplon.dto.warehouse.WarehouseRequest;
import dh13c7.baitaplon.dto.warehouse.WarehouseResponse;
import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Warehouse;
import dh13c7.baitaplon.repository.WarehouseRepository;
import dh13c7.baitaplon.service.WarehouseService;
import dh13c7.baitaplon.service.impl.WarehouseServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("WarehouseService - CRUD & Status Unit Tests")
class WarehouseServiceTest {

    @Mock
    private WarehouseRepository warehouseRepository;

    @InjectMocks
    private WarehouseServiceImpl warehouseService;

    private Warehouse warehouse1;
    private Warehouse warehouse2;

    @BeforeEach
    void setUp() {
        warehouse1 = Warehouse.builder()
                .id(1L)
                .warehouseCode("KHO_HN_01")
                .name("Kho Tổng Hà Nội")
                .address("123 Cầu Giấy, Hà Nội")
                .latitude(21.028511)
                .longitude(105.804817)
                .phone("0912345678")
                .status("ACTIVE")
                .build();

        warehouse2 = Warehouse.builder()
                .id(2L)
                .warehouseCode("KHO_HCM_01")
                .name("Kho Tân Bình TP.HCM")
                .address("456 Cộng Hòa, Tân Bình, TP.HCM")
                .latitude(10.776889)
                .longitude(106.700806)
                .phone("0987654321")
                .status("INACTIVE")
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách kho có phân trang")
    void getAllWarehouses_shouldReturnPagedData() {
        when(warehouseRepository.findAllByOrderByCreatedAtDesc(any(PageRequest.class)))
                .thenReturn(new PageImpl<>(List.of(warehouse1, warehouse2)));

        Page<WarehouseResponse> page = warehouseService.getAllWarehouses(PageRequest.of(0, 10));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent().get(0).getWarehouseCode()).isEqualTo("KHO_HN_01");
    }

    @Test
    @DisplayName("Lấy danh sách kho đang hoạt động (ACTIVE)")
    void getActiveWarehouses_shouldReturnOnlyActive() {
        when(warehouseRepository.findByStatusOrderByNameAsc("ACTIVE"))
                .thenReturn(List.of(warehouse1));

        List<WarehouseResponse> list = warehouseService.getActiveWarehouses();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getStatus()).isEqualTo("ACTIVE");
    }

    @Test
    @DisplayName("Lấy chi tiết kho theo ID thành công")
    void getWarehouseById_Success() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(warehouse1));

        WarehouseDetailResponse res = warehouseService.getWarehouseById(1L);

        assertThat(res.getId()).isEqualTo(1L);
        assertThat(res.getName()).isEqualTo("Kho Tổng Hà Nội");
    }

    @Test
    @DisplayName("Lấy chi tiết kho không tồn tại -> ném ResourceNotFoundException")
    void getWarehouseById_NotFound_ThrowsException() {
        when(warehouseRepository.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> warehouseService.getWarehouseById(999L));
    }

    @Test
    @DisplayName("Tạo kho mới thành công")
    void createWarehouse_Success() {
        WarehouseRequest req = new WarehouseRequest();
        req.setWarehouseCode("kho_dn_01");
        req.setName("Kho Đà Nẵng");
        req.setAddress("789 Nguyễn Văn Linh, Đà Nẵng");
        req.setLatitude(16.054407);
        req.setLongitude(108.202167);
        req.setStatus("ACTIVE");

        when(warehouseRepository.existsByWarehouseCode("KHO_DN_01")).thenReturn(false);
        when(warehouseRepository.save(any(Warehouse.class))).thenAnswer(i -> {
            Warehouse w = i.getArgument(0);
            w.setId(3L);
            return w;
        });

        WarehouseResponse res = warehouseService.createWarehouse(req);

        assertThat(res.getId()).isEqualTo(3L);
        assertThat(res.getWarehouseCode()).isEqualTo("KHO_DN_01");
        assertThat(res.getName()).isEqualTo("Kho Đà Nẵng");
    }

    @Test
    @DisplayName("Tạo kho với mã trùng -> ném BadRequestException")
    void createWarehouse_DuplicateCode_ThrowsException() {
        WarehouseRequest req = new WarehouseRequest();
        req.setWarehouseCode("KHO_HN_01");
        req.setName("Kho khác");
        req.setAddress("Địa chỉ");

        when(warehouseRepository.existsByWarehouseCode("KHO_HN_01")).thenReturn(true);

        assertThrows(BadRequestException.class, () -> warehouseService.createWarehouse(req));
    }

    @Test
    @DisplayName("Cập nhật trạng thái kho sang INACTIVE thành công")
    void updateWarehouseStatus_Success() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(warehouse1));
        when(warehouseRepository.save(any(Warehouse.class))).thenAnswer(i -> i.getArgument(0));

        WarehouseResponse res = warehouseService.updateWarehouseStatus(1L, "INACTIVE");

        assertThat(res.getStatus()).isEqualTo("INACTIVE");
    }

    @Test
    @DisplayName("Cập nhật trạng thái kho không hợp lệ -> ném BadRequestException")
    void updateWarehouseStatus_InvalidStatus_ThrowsException() {
        when(warehouseRepository.findById(1L)).thenReturn(Optional.of(warehouse1));

        assertThrows(BadRequestException.class, () -> warehouseService.updateWarehouseStatus(1L, "DELETED"));
    }

    @Test
    @DisplayName("Lấy kho mặc định hoặc kho active đầu tiên")
    void getDefaultOrFirstActiveWarehouse_ReturnsActive() {
        when(warehouseRepository.findByStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(warehouse1));

        Warehouse def = warehouseService.getDefaultOrFirstActiveWarehouse();

        assertThat(def).isNotNull();
        assertThat(def.getWarehouseCode()).isEqualTo("KHO_HN_01");
    }
}
