package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.notification.BroadcastNotificationRequest;
import dh13c7.baitaplon.dto.notification.NotificationResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface NotificationService {

    Page<NotificationResponse> getUserNotifications(Long userId, String type, Pageable pageable);

    long getUnreadCount(Long userId);

    NotificationResponse markAsRead(Long id, Long userId);

    void markAllAsRead(Long userId);

    void deleteNotification(Long id, Long userId);

    void sendNotification(Long userId, String title, String message, String type, String targetUrl);

    void notifyAdmins(String title, String message, String type, String targetUrl);

    void broadcast(BroadcastNotificationRequest request);
}
