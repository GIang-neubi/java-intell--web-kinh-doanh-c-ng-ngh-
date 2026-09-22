package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.ChatConversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatConversationRepository extends JpaRepository<ChatConversation, String> {

    List<ChatConversation> findAllByOrderByLastMessageAtDesc();

    Optional<ChatConversation> findByUserId(Long userId);

    @Query("SELECT COALESCE(SUM(c.unreadAdmin), 0) FROM ChatConversation c")
    long countTotalUnreadAdmin();
}
