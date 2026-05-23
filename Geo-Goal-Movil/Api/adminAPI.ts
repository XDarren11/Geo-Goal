import api from '@/lib/axios';

export async function getAdminDashboardSummary(): Promise<any> {
  const { data } = await api.get('/admin/dashboard');
  return data;
}

// --- Friendly Matches ---

export async function listFriendlyMatches(page = 1, pageSize = 50): Promise<any> {
  const { data } = await api.get('/admin/friendly-matches', { params: { page, pageSize } });
  return data;
}

export async function createFriendlyMatch(body: {
  homeTeamId: number;
  awayTeamId: number;
  roundName?: string;
  date?: string;
  reason?: string;
}): Promise<any> {
  const { data } = await api.post('/admin/friendly-matches', body);
  return data;
}
