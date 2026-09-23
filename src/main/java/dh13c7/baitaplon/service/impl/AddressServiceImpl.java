package dh13c7.baitaplon.service.impl;

import dh13c7.baitaplon.dto.address.AddressRequest;
import dh13c7.baitaplon.dto.address.AddressResponse;
import dh13c7.baitaplon.exception.ResourceNotFoundException;
import dh13c7.baitaplon.model.Address;
import dh13c7.baitaplon.model.User;
import dh13c7.baitaplon.repository.AddressRepository;
import dh13c7.baitaplon.repository.UserRepository;
import dh13c7.baitaplon.service.AddressService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class AddressServiceImpl implements AddressService {

    private final AddressRepository addressRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AddressResponse> getUserAddresses(Long userId) {
        return addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                .stream()
                .map(AddressResponse::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public AddressResponse getAddressById(Long id, Long userId) {
        Address address = addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập"));
        return AddressResponse.fromEntity(address);
    }

    @Override
    @Transactional(readOnly = true)
    public AddressResponse getDefaultAddress(Long userId) {
        return addressRepository.findByUserIdAndIsDefaultTrue(userId)
                .map(AddressResponse::fromEntity)
                .orElseGet(() -> {
                    List<Address> list = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
                    return list.isEmpty() ? null : AddressResponse.fromEntity(list.get(0));
                });
    }

    @Override
    public AddressResponse createAddress(Long userId, AddressRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thông tin người dùng"));

        long currentCount = addressRepository.countByUserId(userId);
        boolean shouldBeDefault = currentCount == 0 || Boolean.TRUE.equals(request.getIsDefault());

        if (shouldBeDefault && currentCount > 0) {
            addressRepository.findByUserIdAndIsDefaultTrue(userId).ifPresent(oldDef -> {
                oldDef.setIsDefault(false);
                addressRepository.save(oldDef);
            });
        }

        String fullAddress = buildFullAddress(
                request.getDetailAddress(),
                request.getWard(),
                request.getDistrict(),
                request.getProvince()
        );

        String addrType = (request.getAddressType() != null && !request.getAddressType().isBlank())
                ? request.getAddressType().trim().toUpperCase()
                : "HOME";

        Address address = Address.builder()
                .user(user)
                .recipientName(request.getRecipientName().trim())
                .phone(request.getPhone().trim())
                .province(request.getProvince() != null ? request.getProvince().trim() : null)
                .district(request.getDistrict() != null ? request.getDistrict().trim() : null)
                .ward(request.getWard() != null ? request.getWard().trim() : null)
                .detailAddress(request.getDetailAddress().trim())
                .fullAddress(fullAddress)
                .addressType(addrType)
                .isDefault(shouldBeDefault)
                .latitude(request.getLatitude())
                .longitude(request.getLongitude())
                .build();

        Address saved = addressRepository.save(address);
        log.info("Created address ID {} for user ID {} (default: {})", saved.getId(), userId, shouldBeDefault);
        return AddressResponse.fromEntity(saved);
    }

    @Override
    public AddressResponse updateAddress(Long id, Long userId, AddressRequest request) {
        Address address = addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập"));

        boolean requestedDefault = Boolean.TRUE.equals(request.getIsDefault());
        boolean currentDefault = Boolean.TRUE.equals(address.getIsDefault());

        if (requestedDefault && !currentDefault) {
            addressRepository.findByUserIdAndIsDefaultTrue(userId).ifPresent(oldDef -> {
                if (!oldDef.getId().equals(address.getId())) {
                    oldDef.setIsDefault(false);
                    addressRepository.save(oldDef);
                }
            });
            address.setIsDefault(true);
        } else if (!requestedDefault && currentDefault) {
            // Nếu đây là địa chỉ duy nhất, bắt buộc duy trì default = true
            long count = addressRepository.countByUserId(userId);
            if (count > 1) {
                address.setIsDefault(false);
                // Đôn một địa chỉ khác lên làm default
                addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId)
                        .stream()
                        .filter(a -> !a.getId().equals(address.getId()))
                        .findFirst()
                        .ifPresent(next -> {
                            next.setIsDefault(true);
                            addressRepository.save(next);
                        });
            } else {
                address.setIsDefault(true);
            }
        }

        String fullAddress = buildFullAddress(
                request.getDetailAddress(),
                request.getWard(),
                request.getDistrict(),
                request.getProvince()
        );

        String addrType = (request.getAddressType() != null && !request.getAddressType().isBlank())
                ? request.getAddressType().trim().toUpperCase()
                : address.getAddressType();

        address.setRecipientName(request.getRecipientName().trim());
        address.setPhone(request.getPhone().trim());
        address.setProvince(request.getProvince() != null ? request.getProvince().trim() : null);
        address.setDistrict(request.getDistrict() != null ? request.getDistrict().trim() : null);
        address.setWard(request.getWard() != null ? request.getWard().trim() : null);
        address.setDetailAddress(request.getDetailAddress().trim());
        address.setFullAddress(fullAddress);
        address.setAddressType(addrType);
        if (request.getLatitude() != null) address.setLatitude(request.getLatitude());
        if (request.getLongitude() != null) address.setLongitude(request.getLongitude());

        Address updated = addressRepository.save(address);
        log.info("Updated address ID {} for user ID {}", updated.getId(), userId);
        return AddressResponse.fromEntity(updated);
    }

    @Override
    public AddressResponse setDefaultAddress(Long id, Long userId) {
        Address address = addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập"));

        if (!Boolean.TRUE.equals(address.getIsDefault())) {
            addressRepository.findByUserIdAndIsDefaultTrue(userId).ifPresent(oldDef -> {
                oldDef.setIsDefault(false);
                addressRepository.save(oldDef);
            });
            address.setIsDefault(true);
            address = addressRepository.save(address);
            log.info("Set address ID {} as default for user ID {}", address.getId(), userId);
        }

        return AddressResponse.fromEntity(address);
    }

    @Override
    public void deleteAddress(Long id, Long userId) {
        Address address = addressRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy địa chỉ hoặc bạn không có quyền truy cập"));

        boolean wasDefault = Boolean.TRUE.equals(address.getIsDefault());
        addressRepository.delete(address);
        addressRepository.flush();
        log.info("Deleted address ID {} for user ID {}", id, userId);

        // Nếu địa chỉ bị xóa là mặc định, tự động đôn địa chỉ mới nhất còn lại lên làm default
        if (wasDefault) {
            List<Address> remaining = addressRepository.findByUserIdOrderByIsDefaultDescCreatedAtDesc(userId);
            if (!remaining.isEmpty()) {
                Address newDefault = remaining.get(0);
                newDefault.setIsDefault(true);
                addressRepository.save(newDefault);
                log.info("Promoted address ID {} as new default for user ID {}", newDefault.getId(), userId);
            }
        }
    }

    private String buildFullAddress(String detail, String ward, String district, String province) {
        return Stream.of(detail, ward, district, province)
                .filter(s -> s != null && !s.trim().isEmpty())
                .map(String::trim)
                .collect(Collectors.joining(", "));
    }
}
