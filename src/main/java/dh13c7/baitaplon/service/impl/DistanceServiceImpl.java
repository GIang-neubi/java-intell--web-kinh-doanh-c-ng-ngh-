package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.service.DistanceService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@Slf4j
public class DistanceServiceImpl implements DistanceService {

    private static final double EARTH_RADIUS_KM = 6371.0;

    @Override
    public Double calculateDistanceKm(Double lat1, Double lon1, Double lat2, Double lon2) {
        if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
            log.debug("Không thể tính khoảng cách Haversine do thiếu tọa độ: ({}, {}) -> ({}, {})", lat1, lon1, lat2, lon2);
            return null;
        }

        // Validate bounds
        if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90 ||
            lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
            log.warn("Tọa độ không hợp lệ: ({}, {}) -> ({}, {})", lat1, lon1, lat2, lon2);
            return null;
        }

        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double rLat1 = Math.toRadians(lat1);
        double rLat2 = Math.toRadians(lat2);

        double a = Math.sin(dLat / 2.0) * Math.sin(dLat / 2.0) +
                   Math.cos(rLat1) * Math.cos(rLat2) *
                   Math.sin(dLon / 2.0) * Math.sin(dLon / 2.0);

        double c = 2.0 * Math.atan2(Math.sqrt(a), Math.sqrt(1.0 - a));
        double distance = EARTH_RADIUS_KM * c;

        // Làm tròn đến 1 chữ số thập phân
        return BigDecimal.valueOf(distance)
                .setScale(1, RoundingMode.HALF_UP)
                .doubleValue();
    }
}
