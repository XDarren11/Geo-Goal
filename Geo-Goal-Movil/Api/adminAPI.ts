import api from '@/lib/axios';

export async function getAdminDashboardSummary(): Promise<any> {
  const { data } = await api.get('/admin/dashboard');
  return data;
}
