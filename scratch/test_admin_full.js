async function testAdminFull() {
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
      '/api/admin/dashboard',
      '/api/admin/chat/unread-count',
      '/api/admin/products?pageNo=0&pageSize=10',
      '/api/admin/categories',
      '/api/admin/brands',
      '/api/admin/orders?pageNo=0&pageSize=10',
      '/api/admin/users?pageNo=0&pageSize=10',
      '/api/admin/vouchers',
      '/api/admin/inventory/summary'
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep}`, { headers });
      const data = await res.json();
      console.log(`Endpoint ${ep}:`, res.status, data.success ? 'SUCCESS' : 'FAILED', data.message || '');
    }
  } catch (err) {
    console.error('Test Admin Full Error:', err);
  }
}

testAdminFull();
