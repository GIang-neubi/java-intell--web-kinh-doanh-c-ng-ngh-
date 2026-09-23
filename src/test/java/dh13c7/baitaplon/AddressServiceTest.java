package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.address.AddressRequest;
import dh13c7.baitaplon.dto.address.AddressResponse;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Address;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.AddressRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.impl.AddressServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AddressService - CRUD, Default Management & IDOR Protection Unit Tests")
class AddressServiceTest {

    @Mock
    private AddressRepository addressRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AddressServiceImpl addressService;

    private User user;
    private Address addr1;
    private Address addr2;

    @BeforeEach
    void setUp() {
        user = User.builder()
                .id(1L)
                .username("customer1")
                .email("customer1@test.com")
                .role(Role.ROLE_USER)
                .build();

        addr1 = Address.builder()
                .id(101L)
                .user(user)
                .recipientName("Nguyễn Văn A")
                .phone("0912345678")
                .province("Hà Nội")
                .district("Cầu Giấy")
                .ward("Dịch Vọng Hậu")
                .detailAddress("Số 10 Phạm Văn Bạch")
                .fullAddress("Số 10 Phạm Văn Bạch, Dịch Vọng Hậu, Cầu Giấy, Hà Nội")
                .addressType("HOME")
                .isDefault(true)
                .latitude(21.0285)
                .longitude(105.7890)
                .build();

        addr2 = Address.builder()
                .id(102L)
                .user(user)
                .recipientName("Nguyễn Văn A (Công ty)")
                .phone("0987654321")
                .province("Hà Nội")
                .district("Nam Từ Liêm")
                .ward("Mỹ Đình 1")
                .detailAddress("Tòa Keangnam Landmark 72")
                .fullAddress("Tòa Keangnam Landmark 72, Mỹ Đình 1, Nam Từ Liêm, Hà Nội")
                .addressType("OFFICE")
                .isDefault(false)
                .latitude(21.0170)
                .longitude(105.7840)
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách địa chỉ của user thành công")
    void getUserAddresses_shouldReturnSortedList() {
        when(addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(1L))
                .thenReturn(List.of(addr1, addr2));

        List<AddressResponse> result = addressService.getUserAddresses(1L);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(101L);
        assertThat(result.get(0).getIsDefault()).isTrue();
        assertThat(result.get(1).getId()).isEqualTo(102L);
        assertThat(result.get(1).getIsDefault()).isFalse();
    }

    @Test
    @DisplayName("Lấy địa chỉ theo ID thành công")
    void getAddressById_Success() {
        when(addressRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(addr1));

        AddressResponse res = addressService.getAddressById(101L, 1L);

        assertThat(res.getId()).isEqualTo(101L);
        assertThat(res.getRecipientName()).isEqualTo("Nguyễn Văn A");
        assertThat(res.getFullAddress()).contains("Phạm Văn Bạch");
    }

    @Test
    @DisplayName("Lấy địa chỉ không thuộc về user hoặc không tồn tại -> ném ResourceNotFoundException (IDOR Protection)")
    void getAddressById_IDOR_ThrowsException() {
        when(addressRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> addressService.getAddressById(999L, 1L));
    }

    @Test
    @DisplayName("Lấy địa chỉ mặc định của user")
    void getDefaultAddress_ReturnsDefault() {
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(addr1));

        AddressResponse res = addressService.getDefaultAddress(1L);

        assertThat(res).isNotNull();
        assertThat(res.getId()).isEqualTo(101L);
        assertThat(res.getIsDefault()).isTrue();
    }

    @Test
    @DisplayName("Tạo địa chỉ đầu tiên: tự động gán isDefault = true")
    void createAddress_FirstAddress_AutoDefaultTrue() {
        AddressRequest req = AddressRequest.builder()
                .recipientName("Trần Thị B")
                .phone("0901234567")
                .province("Hồ Chí Minh")
                .district("Quận 1")
                .ward("Bến Nghé")
                .detailAddress("123 Lê Duẩn")
                .addressType("HOME")
                .isDefault(false) // Dù client truyền false, vì là địa chỉ đầu tiên nên auto true
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(addressRepository.countByUserId(1L)).thenReturn(0L);
        when(addressRepository.save(any(Address.class))).thenAnswer(i -> {
            Address a = i.getArgument(0);
            a.setId(103L);
            return a;
        });

        AddressResponse res = addressService.createAddress(1L, req);

        assertThat(res.getId()).isEqualTo(103L);
        assertThat(res.getIsDefault()).isTrue();
        assertThat(res.getFullAddress()).isEqualTo("123 Lê Duẩn, Bến Nghé, Quận 1, Hồ Chí Minh");
    }

    @Test
    @DisplayName("Tạo địa chỉ thứ hai đặt là default -> tắt default của địa chỉ cũ")
    void createAddress_NewDefault_UnsetsOldDefault() {
        AddressRequest req = AddressRequest.builder()
                .recipientName("Nguyễn Văn A (Nhà mới)")
                .phone("0912345678")
                .province("Hà Nội")
                .district("Tây Hồ")
                .ward("Quảng An")
                .detailAddress("88 Đặng Thai Mai")
                .addressType("HOME")
                .isDefault(true)
                .build();

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(addressRepository.countByUserId(1L)).thenReturn(1L);
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(addr1));
        when(addressRepository.save(any(Address.class))).thenAnswer(i -> {
            Address a = i.getArgument(0);
            if (a.getId() == null) a.setId(104L);
            return a;
        });

        AddressResponse res = addressService.createAddress(1L, req);

        assertThat(res.getId()).isEqualTo(104L);
        assertThat(res.getIsDefault()).isTrue();
        assertThat(addr1.getIsDefault()).isFalse();
        verify(addressRepository, times(2)).save(any(Address.class));
    }

    @Test
    @DisplayName("Cập nhật địa chỉ và đổi làm mặc định thành công")
    void updateAddress_ToggleDefault_Success() {
        AddressRequest req = AddressRequest.builder()
                .recipientName("Nguyễn Văn A (Cty Mới)")
                .phone("0987654321")
                .province("Hà Nội")
                .district("Nam Từ Liêm")
                .ward("Mỹ Đình 1")
                .detailAddress("Tòa The Manor Mễ Trì")
                .addressType("OFFICE")
                .isDefault(true)
                .build();

        when(addressRepository.findByIdAndUserId(102L, 1L)).thenReturn(Optional.of(addr2));
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(addr1));
        when(addressRepository.save(any(Address.class))).thenAnswer(i -> i.getArgument(0));

        AddressResponse res = addressService.updateAddress(102L, 1L, req);

        assertThat(res.getId()).isEqualTo(102L);
        assertThat(res.getIsDefault()).isTrue();
        assertThat(res.getDetailAddress()).isEqualTo("Tòa The Manor Mễ Trì");
        assertThat(addr1.getIsDefault()).isFalse();
    }

    @Test
    @DisplayName("Cập nhật địa chỉ của user khác -> ném ResourceNotFoundException (IDOR)")
    void updateAddress_IDOR_ThrowsException() {
        AddressRequest req = AddressRequest.builder()
                .recipientName("Hacker")
                .phone("0999999999")
                .detailAddress("Hacked Address")
                .build();

        when(addressRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> addressService.updateAddress(999L, 1L, req));
    }

    @Test
    @DisplayName("Đặt làm địa chỉ mặc định qua setDefaultAddress thành công")
    void setDefaultAddress_Success() {
        when(addressRepository.findByIdAndUserId(102L, 1L)).thenReturn(Optional.of(addr2));
        when(addressRepository.findByUserIdAndIsDefaultTrue(1L)).thenReturn(Optional.of(addr1));
        when(addressRepository.save(any(Address.class))).thenAnswer(i -> i.getArgument(0));

        AddressResponse res = addressService.setDefaultAddress(102L, 1L);

        assertThat(res.getId()).isEqualTo(102L);
        assertThat(res.getIsDefault()).isTrue();
        assertThat(addr1.getIsDefault()).isFalse();
    }

    @Test
    @DisplayName("Xóa địa chỉ mặc định -> tự động đôn địa chỉ tiếp theo lên làm mặc định")
    void deleteAddress_DefaultDeleted_PromotesNext() {
        when(addressRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(addr1));
        when(addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(1L))
                .thenReturn(new ArrayList<>(List.of(addr2)));
        when(addressRepository.save(any(Address.class))).thenAnswer(i -> i.getArgument(0));

        addressService.deleteAddress(101L, 1L);

        verify(addressRepository).delete(addr1);
        verify(addressRepository).flush();
        assertThat(addr2.getIsDefault()).isTrue();
        verify(addressRepository).save(addr2);
    }

    @Test
    @DisplayName("Xóa địa chỉ của user khác -> ném ResourceNotFoundException (IDOR)")
    void deleteAddress_IDOR_ThrowsException() {
        when(addressRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> addressService.deleteAddress(999L, 1L));
        verify(addressRepository, never()).delete(any());
    }
}
