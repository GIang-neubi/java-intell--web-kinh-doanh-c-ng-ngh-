package dh13c7.baitaplon.repository;

import dh13c7.baitaplon.model.Warehouse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WarehouseRepository extends JpaRepository<Warehouse, Long> {

    Optional<Warehouse> findByWarehouseCode(String warehouseCode);

    boolean existsByWarehouseCode(String warehouseCode);

    List<Warehouse> findByStatusOrderByNameAsc(String status);

    Page<Warehouse> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("SELECT w FROM Warehouse w ORDER BY w.status DESC, w.name ASC")
    List<Warehouse> findAllSortedByStatusAndName();
}
