package dh13c7.baitaplon;

import dh13c7.baitaplon.dto.notification.BroadcastNotificationRequest;
import dh13c7.baitaplon.dto.notification.NotificationResponse;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Notification;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.NotificationRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.impl.NotificationServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("NotificationService - CRUD, Filtering, Broadcast & IDOR Protection Unit Tests")
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private User user1;
    private User adminUser;
    private Notification notif1;
    private Notification notif2;

    @BeforeEach
    void setUp() {
        user1 = User.builder()
                .id(1L)
                .username("customer1")
                .fullName("Khách hàng 1")
                .email("customer1@test.com")
                .role(Role.ROLE_USER)
                .build();

        adminUser = User.builder()
                .id(99L)
                .username("admin")
                .fullName("Quản trị viên")
                .email("admin@test.com")
                .role(Role.ROLE_ADMIN)
                .build();

        notif1 = Notification.builder()
                .id(101L)
                .user(user1)
                .title("Đặt hàng thành công!")
                .message("Đơn hàng #ORD-123 đã được tạo")
                .type("ORDER")
                .targetUrl("/orders/1")
                .isRead(false)
                .build();

        notif2 = Notification.builder()
                .id(102L)
                .user(user1)
                .title("Ưu đãi máy ảnh")
                .message("Giảm 10% lens Sony")
                .type("PROMOTION")
                .targetUrl("/products")
                .isRead(true)
                .build();
    }

    @Test
    @DisplayName("Lấy danh sách thông báo phân trang thành công")
    void getUserNotifications_All_ReturnsPaged() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(1L, pageable))
                .thenReturn(new PageImpl<>(List.of(notif1, notif2)));

        Page<NotificationResponse> result = notificationService.getUserNotifications(1L, null, pageable);

        assertThat(result.getContent()).hasSize(2);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Đặt hàng thành công!");
    }

    @Test
    @DisplayName("Lấy thông báo có lọc theo loại TYPE thành công")
    void getUserNotifications_ByType_ReturnsFiltered() {
        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(1L, "ORDER", pageable))
                .thenReturn(new PageImpl<>(List.of(notif1)));

        Page<NotificationResponse> result = notificationService.getUserNotifications(1L, "ORDER", pageable);

        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getType()).isEqualTo("ORDER");
    }

    @Test
    @DisplayName("Lấy số lượng thông báo chưa đọc")
    void getUnreadCount_ReturnsCorrectNumber() {
        when(notificationRepository.countByUserIdAndIsReadFalse(1L)).thenReturn(3L);

        long unread = notificationService.getUnreadCount(1L);

        assertThat(unread).isEqualTo(3L);
    }

    @Test
    @DisplayName("Đánh dấu 1 thông báo là đã đọc thành công")
    void markAsRead_Success() {
        when(notificationRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(notif1));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(i -> i.getArgument(0));

        NotificationResponse res = notificationService.markAsRead(101L, 1L);

        assertThat(res.getIsRead()).isTrue();
        assertThat(notif1.getIsRead()).isTrue();
    }

    @Test
    @DisplayName("Đánh dấu thông báo không thuộc về user -> ném ResourceNotFoundException (IDOR)")
    void markAsRead_IDOR_ThrowsException() {
        when(notificationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.markAsRead(999L, 1L));
    }

    @Test
    @DisplayName("Đánh dấu tất cả thông báo là đã đọc")
    void markAllAsRead_CallsRepository() {
        when(notificationRepository.markAllAsReadByUserId(1L)).thenReturn(2);

        notificationService.markAllAsRead(1L);

        verify(notificationRepository).markAllAsReadByUserId(1L);
    }

    @Test
    @DisplayName("Xóa thông báo thành công")
    void deleteNotification_Success() {
        when(notificationRepository.findByIdAndUserId(101L, 1L)).thenReturn(Optional.of(notif1));

        notificationService.deleteNotification(101L, 1L);

        verify(notificationRepository).delete(notif1);
    }

    @Test
    @DisplayName("Xóa thông báo của user khác -> ném ResourceNotFoundException (IDOR)")
    void deleteNotification_IDOR_ThrowsException() {
        when(notificationRepository.findByIdAndUserId(999L, 1L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> notificationService.deleteNotification(999L, 1L));
        verify(notificationRepository, never()).delete(any());
    }

    @Test
    @DisplayName("Gửi thông báo tới 1 user thành công")
    void sendNotification_Success() {
        when(userRepository.findById(1L)).thenReturn(Optional.of(user1));

        notificationService.sendNotification(1L, "Test Title", "Test Message", "SYSTEM", "/test");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        Notification saved = captor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(1L);
        assertThat(saved.getTitle()).isEqualTo("Test Title");
        assertThat(saved.getMessage()).isEqualTo("Test Message");
        assertThat(saved.getType()).isEqualTo("SYSTEM");
        assertThat(saved.getIsRead()).isFalse();
    }

    @Test
    @DisplayName("Gửi thông báo tới toàn bộ quản trị viên (notifyAdmins)")
    void notifyAdmins_CreatesNotificationsForAdmins() {
        when(userRepository.findByRole(Role.ROLE_ADMIN)).thenReturn(List.of(adminUser));

        notificationService.notifyAdmins("Đơn mới", "Có đơn mới cần duyệt", "ORDER", "/admin/orders/1");

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        List<Notification> list = captor.getValue();

        assertThat(list).hasSize(1);
        assertThat(list.get(0).getUser().getId()).isEqualTo(99L);
        assertThat(list.get(0).getTitle()).isEqualTo("Đơn mới");
    }

    @Test
    @DisplayName("Phát thông báo broadcast tới toàn bộ người dùng")
    void broadcast_AllUsers_Success() {
        when(userRepository.findAll()).thenReturn(List.of(user1, adminUser));

        BroadcastNotificationRequest req = BroadcastNotificationRequest.builder()
                .title("Khuyến mãi Black Friday")
                .message("Giảm giá 30% toàn bộ phụ kiện máy ảnh")
                .type("PROMOTION")
                .targetRole("ALL")
                .build();

        notificationService.broadcast(req);

        ArgumentCaptor<List<Notification>> captor = ArgumentCaptor.forClass(List.class);
        verify(notificationRepository).saveAll(captor.capture());
        List<Notification> list = captor.getValue();

        assertThat(list).hasSize(2);
        assertThat(list.get(0).getType()).isEqualTo("PROMOTION");
    }
}
