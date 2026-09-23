package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.notification.BroadcastNotificationRequest;
import dh13c7.baitaplon.dto.notification.NotificationResponse;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Notification;
import dh13c7.baitaplon.model.Role;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.NotificationRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getUserNotifications(Long userId, String type, Pageable pageable) {
        Page<Notification> page;
        if (type != null && !type.isBlank() && !"ALL".equalsIgnoreCase(type)) {
            page = notificationRepository.findByUserIdAndTypeOrderByCreatedAtDesc(userId, type.trim().toUpperCase(), pageable);
        } else {
            page = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        }
        return page.map(NotificationResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public NotificationResponse markAsRead(Long id, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền truy cập"));

        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification = notificationRepository.save(notification);
        }
        return NotificationResponse.fromEntity(notification);
    }

    @Override
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadByUserId(userId);
        log.info("Marked all notifications as read for user ID {}", userId);
    }

    @Override
    public void deleteNotification(Long id, Long userId) {
        Notification notification = notificationRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông báo hoặc bạn không có quyền truy cập"));
        notificationRepository.delete(notification);
        log.info("Deleted notification ID {} for user ID {}", id, userId);
    }

    @Override
    public void sendNotification(Long userId, String title, String message, String type, String targetUrl) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot send notification: User ID {} not found", userId);
            return;
        }

        Notification notification = Notification.builder()
                .user(user)
                .title(title)
                .message(message)
                .type(type != null ? type.toUpperCase() : "SYSTEM")
                .targetUrl(targetUrl)
                .isRead(false)
                .build();

        notificationRepository.save(notification);
        log.info("Sent notification '{}' to user ID {}", title, userId);
    }

    @Override
    public void notifyAdmins(String title, String message, String type, String targetUrl) {
        List<User> admins = userRepository.findByRole(Role.ROLE_ADMIN);
        if (admins.isEmpty()) return;

        List<Notification> notifications = new ArrayList<>();
        for (User admin : admins) {
            notifications.add(Notification.builder()
                    .user(admin)
                    .title(title)
                    .message(message)
                    .type(type != null ? type.toUpperCase() : "SYSTEM")
                    .targetUrl(targetUrl)
                    .isRead(false)
                    .build());
        }
        notificationRepository.saveAll(notifications);
        log.info("Sent notification '{}' to {} admin(s)", title, admins.size());
    }

    @Override
    public void broadcast(BroadcastNotificationRequest request) {
        if (request.getTargetUserId() != null) {
            sendNotification(request.getTargetUserId(), request.getTitle(), request.getMessage(), request.getType(), request.getTargetUrl());
            return;
        }

        List<User> targets;
        String roleStr = request.getTargetRole() != null ? request.getTargetRole().toUpperCase() : "ALL";

        switch (roleStr) {
            case "ROLE_ADMIN":
                targets = userRepository.findByRole(Role.ROLE_ADMIN);
                break;
            case "ROLE_SHIPPER":
                targets = userRepository.findByRole(Role.ROLE_SHIPPER);
                break;
            case "ROLE_USER":
                targets = userRepository.findByRole(Role.ROLE_USER);
                break;
            default:
                targets = userRepository.findAll();
                break;
        }

        if (targets.isEmpty()) return;

        List<Notification> notifications = new ArrayList<>();
        for (User target : targets) {
            notifications.add(Notification.builder()
                    .user(target)
                    .title(request.getTitle())
                    .message(request.getMessage())
                    .type(request.getType() != null ? request.getType().toUpperCase() : "PROMOTION")
                    .targetUrl(request.getTargetUrl())
                    .isRead(false)
                    .build());
        }
        notificationRepository.saveAll(notifications);
        log.info("Broadcasted notification '{}' to {} users (target: {})", request.getTitle(), notifications.size(), roleStr);
    }
}
