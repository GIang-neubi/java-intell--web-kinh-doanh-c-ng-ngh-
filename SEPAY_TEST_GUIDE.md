# SePay Auto-Confirmation — Test Guide

## Prerequisites
1. **MySQL** running on `localhost:3306` (create database `baitaplon`)
2. **Node.js** installed (frontend dev server)
3. **Java 21 + Maven** installed (backend)
4. **ngrok** installed (for SePay webhook): https://dashboard.ngrok.com/get-started/setup
5. **SePay account** configured with your bank account

## Configuration

### 1. Application Properties
In `src/main/resources/application.properties`:
```properties
# SePay Webhook Secret — set this to match your SePay dashboard
sepay.webhook.secret=YOUR_SECRET_HERE

# Bank config (already set)
sepay.bank.account=7690152904691
sepay.bank.short=MB

# Polling (optional backup — set true to enable)
sepay.polling.enabled=false
sepay.api.base-url=https://api.sepay.vn
sepay.api.key=YOUR_API_KEY
sepay.polling.interval-ms=30000
```

### 2. SePay Dashboard Setup
On SePay merchant dashboard:
- Set Webhook URL: `https://YOUR_NGROK_URL/api/webhook/sepay`
- Set Secret Key: matches `sepay.webhook.secret` above
- Set Bank Account: `7690152904691` (MB Bank)

## Testing Procedure

### Option A: Webhook Test (Primary)
1. Start ngrok in one terminal:
   ```
   start-ngrok.bat
   ```
2. Start backend:
   ```
   cd baitaplon
   .\mvnw spring-boot:run
   ```
3. Start frontend:
   ```
   cd frontend
   npm run dev
   ```
4. Open http://localhost:5173 — log in as a user
5. Place an order with **BANKING** payment method
6. Note the order code (e.g., `ORD-XXXXXXXX`)
7. Transfer content will be: `HG ORD-XXXXXXXX`
8. From your bank app (or SePay test mode), transfer money:
   - **To**: 7690152904691 (MB Bank, NGUYEN TRUONG GIANG)
   - **Amount**: Same as order total (±1000đ tolerance)
   - **Content/Noi dung**: `HG ORD-XXXXXXXX`
9. Watch the browser console (`F12`) for `[Poll]` logs every 5 seconds
10. When payment arrives:
    - Backend receives webhook → confirms order
    - OR polling service detects it (if enabled)
    - Frontend auto-redirects to `/orders` after 3 seconds

### Option B: Polling Test (Backup)
1. Set `sepay.polling.enabled=true` in `application.properties`
2. Set `sepay.api.base-url` and `sepay.api.key` with your SePay API credentials
3. Follow same steps as above, but the backend polls SePay API every 30s instead of waiting for webhook
4. Console will show `[SePayPoll]` logs

### Option C: Manual DB Test
1. Start backend and frontend
2. Place a BANKING order
3. In MySQL:
   ```sql
   UPDATE orders SET payment_status='PAID', status='CONFIRMED' 
   WHERE order_code='ORD-XXXXXXXX';
   ```
4. Refresh the checkout page — it should show "Thanh toán thành công" and redirect

## Console Output Examples

### Successful payment:
```
[Poll] Started for order ORD-ABC12345
[Poll] GET /api/orders/me/ 1
[Poll] Response: true status= PAID
[Poll] ✅ PAID confirmed
[Redirect] PAID — navigating to /orders in 3s
```

### Polling service:
```
[SePayPoll] === Poll started ===
[SePayPoll] Found 2 pending
[SePayPoll] Checking ORD-ABC12345 | content='HG ORD-ABC12345'
[SePayPoll] Checking ORD-DEF67890 | content='HG ORD-DEF67890'
[SePayPoll] ✅ Confirming ORD-ABC12345 | amount=500000
[SePayPoll] ✅ ORD-ABC12345 is now PAID
[SePayPoll] === Poll done === confirmed=1, failed=0
```

## Troubleshooting

### Payment not detected
- Check ngrok URL is correct in SePay dashboard
- Check `sepay.webhook.secret` matches SePay dashboard
- Check MySQL: is order `paymentStatus=PENDING`?
- Check transfer content matches exactly: `HG ORD-XXXXXX`
- Check console for `[SePayWebhook]` or `[SePayPoll]` logs

### Auth failed on webhook
- Log shows `AUTH FAILED` → secret mismatch
- Check SePay dashboard webhook secret matches `sepay.webhook.secret`
- Default secret `HG_SEPAY_SECRET_2026` bypasses auth (test mode)

### Order status not updating
- Check backend logs for errors
- Check MySQL connection in `application.properties`
- Verify order is `PENDING` (not already `PAID`)
