# H&G Express — Hướng Dẫn Kiểm Thử Luồng Vận Chuyển E2E (End-to-End Test Guide)

Tài liệu hướng dẫn kiểm thử toàn diện nghiệp vụ **Hệ thống Quản lý Vận chuyển & Logistics (Delivery Management System)** trong dự án H&G Technology & Camera E-commerce Store ("Phát triển phần mềm hướng dịch vụ").

---

## 1. Môi Trường & Tài Khoản Kiểm Thử (Test Environment)

### A. Khởi động ứng dụng
1. **Cơ sở dữ liệu (MySQL / MariaDB):**
   - Đảm bảo MySQL đang chạy (mặc định cấu hình tại `src/main/resources/application.properties`).
2. **Backend Spring Boot:**
   ```bash
   cd baitaplon
   .\mvnw.cmd spring-boot:run
   ```
   *Cổng chạy: `http://localhost:8080`*
3. **Frontend Vite React:**
   ```bash
   cd frontend
   npm run dev
   ```
   *Cổng chạy: `http://localhost:5173`*

---

### B. Danh Sách Tài Khoản Thử Nghiệm Mặc Định (Default Credentials)

Hệ thống được cấu hình tự động khởi tạo dữ liệu mẫu (`AdminDataInitializer.java`):

| Vai trò | Tên đăng nhập | Mật khẩu | Họ và tên | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin` | `12345678` | Quản Trị Viên H&G | Giám sát Dashboard, điều phối shipper, lên lịch giao lại, đối soát COD |
| **Shipper 1** | `shipper1` | `12345678` | Nguyễn Văn Nam (Shipper Nhanh) | Nhận đơn, di chuyển, nhập OTP, nộp tiền COD |
| **Shipper 2** | `shipper2` | `12345678` | Trần Văn Hùng (Shipper Tiết Kiệm) | Nhận đơn, báo giao thất bại, cập nhật bằng chứng |
| **Khách hàng (Customer)** | Đăng ký tại `/register` hoặc tài khoản có sẵn | `12345678` | Khách Hàng | Mua hàng, theo dõi lộ trình thời gian thực, nhận mã OTP bí mật |

---

## 2. Kịch Bản 1: Luồng Giao Hàng Chuẩn (Happy Path - Thành Công 100%)

Kịch bản này mô phỏng đơn hàng từ lúc đặt mua đến khi giao hàng hoàn tất bằng mã OTP và nộp tiền COD.

### Bước 1: Khách hàng mua hàng & Tạo phiếu giao hàng tự động
1. Truy cập `http://localhost:5173/login`, đăng nhập tài khoản Khách hàng (hoặc đăng ký mới).
2. Chọn sản phẩm bất kỳ (ví dụ: máy ảnh Sony Alpha hoặc máy ảnh Canon), thêm vào giỏ hàng.
3. Đi tới trang **Thanh Toán (`/checkout`)**:
   - Chọn **Phương thức giao hàng**: *Giao Tiêu Chuẩn*, *Giao Hỏa Tốc (Express)* hoặc *Giao Trong Ngày*.
   - Chọn **Phương thức thanh toán**: *Thanh toán khi nhận hàng (COD)*.
   - Nhập thông tin người nhận: Họ tên, số điện thoại, địa chỉ nhận hàng.
   - Bấm **"Đặt hàng ngay"**.
4. ✅ **Kết quả mong đợi:** 
   - Đơn hàng được tạo thành công với mã dạng `#ORD-XXXXXXXX`.
   - Hệ thống tự động khởi tạo 1 phiếu giao hàng liên kết tương ứng (`Delivery`) với trạng thái `PENDING_ASSIGNMENT` (Chờ phân công) và ghi nhận mốc hành trình đầu tiên.

---

### Bước 2: Admin điều phối & Phân công Shipper
1. Đăng xuất hoặc mở tab ẩn danh, đăng nhập tài khoản Admin: `admin` / `12345678`.
2. Truy cập **Admin Dashboard (`/admin`)**:
   - Quan sát mục **"Trung Tâm Vận Chuyển & Logistics"**: Thẻ *"Chờ phân công"* hiển thị số lượng đơn mới cần xử lý.
   - Bấm trực tiếp vào thẻ hoặc truy cập menu **"Quản lý giao hàng" (`/admin/deliveries`)**.
3. Tại danh sách phiếu giao, tìm đơn hàng vừa tạo:
   - Trạng thái hiện tại: `Chờ phân công` (huy hiệu màu vàng cam).
   - Bấm nút **"Phân công Shipper"** (icon hình người gán việc).
   - Trong modal: Chọn `Nguyễn Văn Nam (Shipper Nhanh)`, nhập ghi chú *"Giao giờ hành chính, hàng giá trị cao nhẹ tay"*, bấm **"Xác nhận phân công"**.
4. ✅ **Kết quả mong đợi:**
   - Phiếu giao chuyển trạng thái sang `ASSIGNED` (Đã gán shipper).
   - Đơn hàng tự động đồng bộ sang trạng thái `CONFIRMED`.
   - Nhật ký hành trình ghi nhận bước phân công của Admin.

---

### Bước 3: Shipper tiếp nhận và vận chuyển đơn hàng
1. Đăng nhập tài khoản Shipper 1: `shipper1` / `12345678`.
2. Truy cập **Cổng Shipper Giao Hàng (`/shipper`)**:
   - Tab *"Đơn được gán"*: Xuất hiện đơn hàng vừa được Admin phân công.
   - Bấm **"Nhận đơn"** $\to$ Đơn chuyển sang `SHIPPER_ACCEPTED`.
   - Di chuyển đến kho hàng H&G, bấm **"Đã lấy hàng tại kho"** $\to$ Chuyển sang `PICKED_UP`. (Đơn hàng tự động đồng bộ sang `PROCESSING`).
   - Bấm **"Bắt đầu giao hàng"** $\to$ Chuyển sang `IN_TRANSIT`. (Hệ thống tự động ghi nhận tọa độ GPS và chuyển đơn hàng sang `SHIPPING`).
   - Khi đến địa chỉ người nhận, bấm **"Đã đến nơi"** $\to$ Chuyển sang `ARRIVED`.
3. ✅ **Kết quả mong đợi:**
   - Khi Shipper bấm *"Đã đến nơi"*, backend tự động sinh ngẫu nhiên **Mã xác thực giao hàng OTP 6 chữ số** (ví dụ: `482910`).
   - **Bảo mật OTP:** Shipper **hoàn toàn KHÔNG nhìn thấy** mã OTP này (trên màn hình shipper chỉ có ô để nhập mã xác thực do khách cung cấp).

---

### Bước 4: Khách hàng tra cứu lộ trình & Nhận mã xác thực OTP
1. Mở lại trình duyệt của Khách hàng, vào trang **Chi tiết đơn hàng (`/orders/:id`)**:
   - Khung **Hành trình giao hàng (Delivery Timeline)** hiển thị đầy đủ các mốc thời gian thực từ lúc tạo đơn, shipper nhận hàng đến khi shipper tới nơi.
   - Khi đơn ở trạng thái `ARRIVED`, hiển thị **Hộp Mã Xác Nhận Giao Hàng (Delivery Confirmation OTP)** màu xanh ngọc nổi bật:
     ```
     ┌──────────────────────────────────────────────────┐
     │  Mã Xác Nhận Nhận Hàng (Cung cấp cho Shipper):   │
     │                   [ 4 8 2 9 1 0 ]                │
     │  Vui lòng chỉ cung cấp mã này khi đã kiểm tra    │
     │  và nhận đúng bưu kiện từ Shipper H&G            │
     └──────────────────────────────────────────────────┘
     ```
2. Khách hàng kiểm tra gói hàng, thanh toán tiền mặt COD cho Shipper và đọc mã OTP `482910`.

---

### Bước 5: Shipper xác thực OTP và hoàn tất đơn giao
1. Trên màn hình của Shipper (`/shipper/:id`):
   - Nhập mã OTP gồm 6 chữ số do khách đọc.
   - *(Tùy chọn)* Bấm tải lên ảnh chụp bằng chứng gói hàng đã trao tay khách.
   - Nhập ghi chú: *"Khách đã nhận đủ hàng và thanh toán tiền mặt"*.
   - Bấm **"Xác nhận hoàn tất giao hàng"**.
2. ✅ **Cơ chế chống brute-force:** Nếu nhập sai OTP, hệ thống báo lỗi cụ thể và đếm số lần sai (tối đa 5 lần).
3. ✅ **Kết quả khi nhập đúng OTP:**
   - Phiếu giao chuyển trạng thái sang `DELIVERED` (Giao thành công).
   - Đơn hàng tự động chuyển sang trạng thái `DELIVERED`.
   - Vì là đơn COD, trạng thái thanh toán của đơn hàng được hệ thống tự động đổi sang `PAID` (Đã thanh toán).
   - Số tiền COD được tự động cộng vào **Ví COD đang giữ** của Shipper Nguyễn Văn Nam.

---

### Bước 6: Admin đối soát và thu nộp tiền mặt COD
1. Đăng nhập lại tài khoản Admin: `admin` / `12345678`.
2. Mở **Admin Dashboard (`/admin`)**:
   - Thẻ *"Tiền COD đang giữ"* hiển thị số tiền mặt shipper đang giữ kèm số lượng đơn đã thu.
   - Bấm nút **"Đối soát COD"** (trên Dashboard hoặc trên trang `/admin/deliveries`).
3. Trong modal **Đối Soát & Quyết Toán Tiền Mặt COD**:
   - Danh sách Shipper hiển thị dòng: `Nguyễn Văn Nam` — Số tiền đang giữ: `... đ` (Chờ nộp).
   - Bấm nút **"Thu tiền & Quyết toán"**.
   - Admin xác nhận thu đủ tiền mặt từ Shipper.
4. ✅ **Kết quả mong đợi:**
   - Toàn bộ các đơn COD của shipper được đánh dấu `codSettled = true` kèm mốc thời gian đối soát.
   - Số dư COD chờ nộp trên Dashboard và trên ví Shipper lập tức trở về `0 đ` theo thời gian thực.

---

## 3. Kịch Bản 2: Luồng Giao Hàng Thất Bại & Điều Phối Giao Lại (Re-Delivery)

Kịch bản này mô phỏng trường hợp Shipper đến nơi nhưng không liên lạc được với người nhận và Admin lên lịch giao lại lần 2.

### Bước 1: Shipper báo cáo giao hàng thất bại
1. Khi đơn ở trạng thái `ARRIVED` hoặc `IN_TRANSIT`, Shipper không gặp được khách.
2. Shipper bấm nút **"Báo cáo giao thất bại"**:
   - Chọn lý do: `CUSTOMER_UNREACHABLE` (Không liên lạc được với khách hàng).
   - Nhập ghi chú: *"Đã gọi 3 cuộc khách không bắt máy, bảo vệ tòa nhà không nhận thay"*.
   - Bấm **"Gửi báo cáo thất bại"**.
3. ✅ **Kết quả mong đợi:**
   - Phiếu giao chuyển trạng thái sang `DELIVERY_FAILED` (Giao thất bại).
   - Đơn hàng giữ nguyên để chờ Admin điều phối lại.
   - Thẻ hiển thị số lần giao ghi nhận: `Lần 1/3`.

---

### Bước 2: Admin lên lịch và kích hoạt giao lại (Re-delivery)
1. Admin truy cập **Dashboard (`/admin`)** hoặc **Danh sách phiếu giao (`/admin/deliveries?status=DELIVERY_FAILED`)**:
   - Đơn hàng xuất hiện với huy hiệu đỏ *"Giao thất bại"* và tag `Lần 1/3`.
   - Bấm nút **"Xử lý giao lại / Hoàn kho"**.
2. Trong modal **Xử Lý Đơn Giao Thất Bại**:
   - Chọn tab **"Hẹn giao lại"**:
     - Shipper phụ trách: Chọn lại `Nguyễn Văn Nam` hoặc đổi sang `Trần Văn Hùng`.
     - Thời gian hẹn giao lại: Chọn ngày giờ hẹn trong tương lai (ví dụ: ngày mai lúc 09:00).
     - Ghi chú điều phối: *"CSKH đã gọi lại cho khách hẹn giao buổi sáng trước 11h"*.
   - Bấm **"Kích hoạt giao lại"**.
3. ✅ **Kết quả mong đợi:**
   - Số lần giao tăng lên `2/3`.
   - Phiếu giao được chuyển trạng thái về `ASSIGNED` để shipper tiếp nhận lại.
   - Hệ thống tự động reset mã OTP cũ để đảm bảo an toàn tuyệt đối cho lần giao mới.
   - Khách hàng xem lộ trình sẽ thấy thông báo: *"Hẹn giao lại dự kiến: [Ngày/Giờ]"*.
   - Shipper mở đơn hàng sẽ thấy khung cảnh báo màu vàng nổi bật: `⚠️ Đơn giao lại lần 2/3` kèm lời dặn CSKH để chú ý phục vụ.

---

## 4. Kịch Bản 3: Hoàn Hàng Về Kho & Tự Động Khôi Phục Tồn Kho Sản Phẩm (Return & Restock)

Kịch bản mô phỏng đơn hàng giao thất bại quá 3 lần hoặc khách hàng xác nhận hủy/bom hàng, cần hoàn trả về kho H&G và phục hồi tồn kho.

1. Khi đơn giao thất bại, Admin mở modal xử lý tại `/admin/deliveries/:id`.
2. Chọn tab **"Hoàn hàng về kho"**:
   - Lý do hoàn hàng: Chọn `Đã thử giao tối đa 3 lần thất bại` hoặc `Khách hàng từ chối nhận (Bom hàng)`.
   - Đánh dấu chọn: ☑ **"Tự động hoàn trả số lượng vào kho hàng H&G (Restock)"**.
   - Nhập ghi chú: *"Hàng đã kiểm tra nguyên vẹn niêm phong, nhập lại kho H&G"*.
   - Bấm **"Xác nhận hoàn hàng về kho"**.
3. ✅ **Kết quả mong đợi:**
   - Phiếu giao chuyển sang trạng thái `CANCELLED` và đánh dấu `returnedToWarehouse = true`.
   - Đơn hàng chuyển sang trạng thái `CANCELLED`.
   - **Đặc biệt:** Hệ thống tự động **cộng hoàn trả lại số lượng tồn kho sản phẩm** (`product.stock += item.quantity`).
   - Kiểm tra tại trang **Quản lý kho (`/admin/inventory`)** hoặc chi tiết sản phẩm, số lượng tồn kho đã được khôi phục chính xác.

---

## 5. Bảng Tra Cứu Toàn Bộ REST API Giao Vận (Logistics API Matrix)

| Phương thức | Endpoint URI | Phân quyền | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/deliveries` | `ROLE_ADMIN` | Danh sách phiếu giao phân trang, tìm kiếm & lọc đa tiêu chí |
| `GET` | `/api/admin/deliveries/{id}` | `ROLE_ADMIN` | Xem chi tiết phiếu giao kèm sản phẩm & lộ trình đầy đủ |
| `POST` | `/api/admin/deliveries/{id}/assign` | `ROLE_ADMIN` | Phân công hoặc thay đổi Shipper phụ trách |
| `GET` | `/api/admin/deliveries/shippers` | `ROLE_ADMIN` | Danh sách Shipper kèm số đơn đang giao & đã hoàn tất |
| `GET` | `/api/admin/deliveries/stats` | `ROLE_ADMIN` | Thống kê số lượng đơn theo từng trạng thái vận chuyển |
| `GET` | `/api/admin/deliveries/cod-reconciliation` | `ROLE_ADMIN` | Báo cáo đối soát tiền mặt COD toàn hệ thống |
| `POST` | `/api/admin/deliveries/{id}/settle-cod` | `ROLE_ADMIN` | Quyết toán tiền COD của 1 đơn hàng cụ thể |
| `POST` | `/api/admin/deliveries/shippers/{id}/settle-cod`| `ROLE_ADMIN` | Quyết toán toàn bộ tiền COD của 1 shipper |
| `POST` | `/api/admin/deliveries/{id}/redeliver` | `ROLE_ADMIN` | Lên lịch và kích hoạt giao lại (tối đa 3 lần) |
| `POST` | `/api/admin/deliveries/{id}/return-to-warehouse`| `ROLE_ADMIN` | Hoàn hàng về kho & tự động hoàn trả tồn kho sản phẩm |
| `GET` | `/api/shipper/deliveries` | `ROLE_SHIPPER` | Lấy danh sách đơn hàng được gán cho shipper hiện tại |
| `GET` | `/api/shipper/deliveries/{id}` | `ROLE_SHIPPER` | Chi tiết đơn hàng (ẩn mã xác thực OTP) |
| `POST` | `/api/shipper/deliveries/{id}/accept` | `ROLE_SHIPPER` | Shipper chấp nhận đơn giao |
| `POST` | `/api/shipper/deliveries/{id}/pickup` | `ROLE_SHIPPER` | Báo đã lấy hàng tại kho H&G |
| `POST` | `/api/shipper/deliveries/{id}/start` | `ROLE_SHIPPER` | Bắt đầu di chuyển giao hàng kèm tọa độ GPS |
| `POST` | `/api/shipper/deliveries/{id}/arrive` | `ROLE_SHIPPER` | Đã đến địa chỉ giao (kích hoạt sinh mã OTP 6 số) |
| `POST` | `/api/shipper/deliveries/{id}/complete` | `ROLE_SHIPPER` | Đối chiếu mã OTP, hoàn tất giao & thu tiền COD |
| `POST` | `/api/shipper/deliveries/{id}/fail` | `ROLE_SHIPPER` | Báo cáo giao hàng thất bại kèm lý do |
| `POST` | `/api/shipper/deliveries/upload-proof` | `ROLE_SHIPPER` | Upload ảnh chụp bằng chứng giao hàng |
| `GET` | `/api/shipper/deliveries/cod-summary` | `ROLE_SHIPPER` | Thống kê ví tiền COD đang giữ và đã nộp |
| `GET` | `/api/deliveries/order/{orderId}` | Đã xác thực | Khách hàng lấy thông tin vận chuyển theo Order ID |
| `GET` | `/api/deliveries/{id}` | Đã xác thực | Khách hàng lấy chi tiết phiếu giao & xem mã OTP |
| `GET` | `/api/deliveries/{id}/tracking` | Đã xác thực | Xem toàn bộ lịch sử hành trình giao hàng |
| `POST` | `/api/deliveries/{id}/confirm-received` | Khách sở hữu | Khách hàng chủ động xác nhận đã nhận được hàng |

---

## 6. Tổng Kết & Đánh Giá Tiêu Chí Hoàn Thành (Definition of Done)

- [x] **Core Domain & Security:** 9 trạng thái giao vận, mã OTP 6 số ngẫu nhiên, chống IDOR, bảo mật đa tầng.
- [x] **Tự động hóa hoàn chỉnh:** Tự động tạo phiếu giao khi đặt hàng, tự hủy phiếu giao khi hủy đơn, tự động cập nhật đơn hàng sang `PAID` khi giao thành công đơn COD.
- [x] **Đầy đủ 3 giao diện người dùng:** Portal Quản trị viên (Admin), Portal Shipper Mobile, Tra cứu Khách hàng (Customer Timeline).
- [x] **Quản lý thu hộ COD & Đối soát quỹ:** Minh bạch dòng tiền mặt, quyết toán 1 chạm, chống thất thoát.
- [x] **Xử lý ngoại lệ & Giao lại:** Giới hạn 3 lần thử, hẹn lịch giao lại, chuyển hoàn kho và tự động hồi phục tồn kho sản phẩm.
- [x] **Trung tâm điều hành Logistics Hub trên Dashboard:** Trực quan hóa dữ liệu thời gian thực.
- [x] **Chất lượng mã nguồn:** 100% test pass rate (`60/60 tests PASSED`), production build sạch không lỗi (`npm run build`).
