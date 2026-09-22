package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.exception.BadRequestException;
import dh13c7.baitaplon.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@Slf4j
public class FileStorageServiceImpl implements FileStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");
    private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    @Value("${hg.upload.dir:uploads}")
    private String uploadDir;

    @Value("${hg.upload.max-file-size:5242880}")
    private long maxFileSize;

    private Path productUploadPath;

    @PostConstruct
    public void init() throws IOException {
        productUploadPath = Paths.get(uploadDir, "products").toAbsolutePath().normalize();
        Files.createDirectories(productUploadPath);
        log.info("Product upload directory: {}", productUploadPath);
    }

    @Override
    public String storeProductImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File ảnh không được để trống");
        }
        if (file.getSize() > maxFileSize) {
            throw new BadRequestException("Ảnh vượt quá dung lượng cho phép (tối đa 5MB)");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_CONTENT_TYPES.contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new BadRequestException("Chỉ chấp nhận ảnh JPG, JPEG, PNG, WEBP");
        }

        String original = StringUtils.cleanPath(file.getOriginalFilename() == null ? "" : file.getOriginalFilename());
        if (original.contains("..")) {
            throw new BadRequestException("Tên file không hợp lệ");
        }

        String extension = extractExtension(original, contentType);
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("Định dạng ảnh không được hỗ trợ");
        }

        String filename = UUID.randomUUID().toString().replace("-", "") + "." + extension;
        Path target = productUploadPath.resolve(filename).normalize();
        if (!target.startsWith(productUploadPath)) {
            throw new BadRequestException("Đường dẫn lưu file không hợp lệ");
        }

        try (InputStream inputStream = file.getInputStream()) {
            Files.copy(inputStream, target, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException e) {
            throw new BadRequestException("Không thể lưu file ảnh: " + e.getMessage());
        }

        return "/uploads/products/" + filename;
    }

    @Override
    public void deleteIfExists(String publicPath) {
        if (publicPath == null || publicPath.isBlank()) {
            return;
        }
        if (!publicPath.startsWith("/uploads/products/")) {
            return;
        }
        String filename = publicPath.substring("/uploads/products/".length());
        if (filename.contains("..") || filename.contains("/") || filename.contains("\\")) {
            return;
        }
        Path target = productUploadPath.resolve(filename).normalize();
        if (!target.startsWith(productUploadPath)) {
            return;
        }
        try {
            Files.deleteIfExists(target);
        } catch (IOException e) {
            log.warn("Could not delete file {}: {}", target, e.getMessage());
        }
    }

    private String extractExtension(String originalFilename, String contentType) {
        String ext = "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot >= 0 && dot < originalFilename.length() - 1) {
            ext = originalFilename.substring(dot + 1).toLowerCase(Locale.ROOT);
        }
        if (ALLOWED_EXTENSIONS.contains(ext)) {
            return ext.equals("jpeg") ? "jpg" : ext;
        }
        return switch (contentType.toLowerCase(Locale.ROOT)) {
            case "image/jpeg" -> "jpg";
            case "image/png" -> "png";
            case "image/webp" -> "webp";
            default -> "";
        };
    }
}
