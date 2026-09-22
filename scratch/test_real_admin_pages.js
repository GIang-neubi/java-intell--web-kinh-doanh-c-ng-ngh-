async function testRealAdmin() {
  const baseUrl = 'http://localhost:5173';
  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data?.token;
    console.log('Login success:', !!token, 'Role:', loginData.data?.role);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    const endpoints = [
      { name: 'Dashboard', url: '/api/admin/dashboard' },
      { name: 'Unread Chat', url: '/api/admin/chat/unread-count' },
      { name: 'Chat Conversations', url: '/api/admin/chat/conversations' },
      { name: 'Products (used by ProductList)', url: '/api/products?pageNo=0&pageSize=10' },
      { name: 'Categories (used by CategoryList)', url: '/api/categories' },
      { name: 'Brands (used by BrandList)', url: '/api/brands' },
      { name: 'Orders (used by OrderList)', url: '/api/admin/orders?pageNo=0&pageSize=10' },
      { name: 'Users (used by UserList)', url: '/api/admin/users?pageNo=0&pageSize=10' },
      { name: 'Vouchers (used by VoucherList)', url: '/api/admin/vouchers' },
      { name: 'Inventory Logs (used by InventoryManager)', url: '/api/admin/inventory/logs' },
      { name: 'AI Settings', url: '/api/admin/ai/config' },
      { name: 'Reports Summary', url: '/api/admin/reports/summary' }
    ];

    let allPass = true;
    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.url}`, { headers });
      const data = await res.json();
      const ok = res.status === 200 && data.success;
      if (!ok) allPass = false;
      console.log(`[${ok ? 'PASS' : 'FAIL'}] ${ep.name} (${ep.url}): status ${res.status}`);
      if (!ok) console.log('   Error detail:', data);
    }

    console.log('\nResult:', allPass ? 'ALL REAL ADMIN ENDPOINTS PASSED!' : 'SOME FAILED!');
  } catch (err) {
    console.error('Test Real Admin Error:', err);
  }
}

testRealAdmin();
