package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Voucher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VoucherRepository extends JpaRepository<Voucher, Long> {

    Optional<Voucher> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Query("SELECT v FROM Voucher v WHERE " +
           "(:keyword IS NULL OR LOWER(v.code) LIKE LOWER(CONCAT('%',:keyword,'%')) " +
           "  OR LOWER(v.description) LIKE LOWER(CONCAT('%',:keyword,'%'))) " +
           "AND (:active IS NULL OR v.active = :active) " +
           "ORDER BY v.createdAt DESC")
    Page<Voucher> searchVouchers(@Param("keyword") String keyword,
                                 @Param("active") Boolean active,
                                 Pageable pageable);
}
