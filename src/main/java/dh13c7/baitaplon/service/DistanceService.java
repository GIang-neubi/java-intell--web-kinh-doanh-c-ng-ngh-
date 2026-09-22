package dh13c7.baitaplon.service;

public interface DistanceService {

    /**
     * Tính khoảng cách đường chim bay (km) giữa 2 tọa độ theo công thức Haversine.
     * Trả về null nếu một trong các tọa độ bị thiếu (null).
     */
    Double calculateDistanceKm(Double lat1, Double lon1, Double lat2, Double lon2);
}
