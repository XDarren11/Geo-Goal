import api from '@/lib/axios';
import type { NotificationItem } from '@/types';

export async function getMyNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>('/notifications', {
    params: { unreadOnly },
  });

  return Array.isArray(data) ? data : [];
}

export async function markAllNotificationsAsRead(): Promise<string> {
  const { data } = await api.patch<{ message: string }>('/notifications/read-all');
  return data?.message ?? 'ok';
}

export async function registerDeviceToken(
  token: string,
  platform: 'ios' | 'android' | 'web'
): Promise<void> {
  await api.post('/account/device-tokens', { token, platform });
}

export async function unregisterDeviceToken(token: string): Promise<void> {
  await api.delete(`/account/device-tokens/${encodeURIComponent(token)}`);
}


