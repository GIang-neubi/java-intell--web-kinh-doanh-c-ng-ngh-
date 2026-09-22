import api from './client';

export async function fetchDashboard() {
  const { data } = await api.get('/admin/dashboard');
  if (!data.success) throw new Error(data.message || 'Không tải được dashboard');
  return data.data;
}

/**
 * Lấy báo cáo tổng hợp
 * @param {object} params - { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
 */
export async function fetchReportSummary(params = {}) {
  const { data } = await api.get('/admin/reports/summary', { params });
  if (!data.success) throw new Error(data.message || 'Không tải được báo cáo');
  return data.data; // ReportSummaryDTO
}
