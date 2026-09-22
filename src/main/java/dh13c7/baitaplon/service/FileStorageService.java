package dh13c7.baitaplon.service;

import org.springframework.web.multipart.MultipartFile;

public interface FileStorageService {
    String storeProductImage(MultipartFile file);
    void deleteIfExists(String publicPath);
}
