package dh13c7.baitaplon.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.math.BigDecimal;

/**
 * DTO nhận webhook từ SePay khi có giao dịch ngân hàng thành công.
 * Tài liệu: https://docs.sepay.vn/thong-bao-bien-dong-so-du.html
 */
@Data
public class SePayWebhookDTO {

    /** ID giao dịch trên SePay */
    private Long id;

    /** Cổng nhận (tên ngân hàng) */
    private String gateway;

    /** Thời gian giao dịch */
    @JsonProperty("transactionDate")
    private String transactionDate;

    /** Mã tham chiếu nội bộ ngân hàng */
    @JsonProperty("accountNumber")
    private String accountNumber;

    /** Nội dung chuyển khoản — dùng để match với order */
    private String content;

    /** Số tiền giao dịch (dương = tiền vào, âm = tiền ra) */
    private BigDecimal transferAmount;

    /** Số dư sau giao dịch */
    private BigDecimal accumulated;

    /** Mô tả thêm */
    private String description;

    /** Loại giao dịch: "in" hoặc "out" */
    @JsonProperty("transferType")
    private String transferType;

    /** Mã tham chiếu ngân hàng */
    @JsonProperty("referenceCode")
    private String referenceCode;

    /** Webhook code từ SePay (dùng để xác thực) */
    @JsonProperty("code")
    private String code;

    /** Trạng thái từ SePay */
    @JsonProperty("subAccId")
    private String subAccId;
}
