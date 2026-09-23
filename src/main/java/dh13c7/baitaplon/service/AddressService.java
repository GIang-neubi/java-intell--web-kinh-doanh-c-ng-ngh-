package dh13c7.baitaplon.service;

import dh13c7.baitaplon.dto.address.AddressRequest;
import dh13c7.baitaplon.dto.address.AddressResponse;

import java.util.List;

public interface AddressService {

    List<AddressResponse> getUserAddresses(Long userId);

    AddressResponse getAddressById(Long id, Long userId);

    AddressResponse getDefaultAddress(Long userId);

    AddressResponse createAddress(Long userId, AddressRequest request);

    AddressResponse updateAddress(Long id, Long userId, AddressRequest request);

    AddressResponse setDefaultAddress(Long id, Long userId);

    void deleteAddress(Long id, Long userId);
}
