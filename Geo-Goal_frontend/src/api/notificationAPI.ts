import api from '@/lib/axios';
import type { NotificationItem } from '@/types';

const BASE = '/notifications';

export async function getMyNotifications(unreadOnly = false): Promise<NotificationItem[]> {
  const { data } = await api.get<NotificationItem[]>(BASE, {
    params: { unreadOnly },
  });
  return Array.isArray(data) ? data : [];
}

export async function markNotificationAsRead(notificationId: number): Promise<string> {
  const { data } = await api.patch<{ message: string }>(`${BASE}/${notificationId}/read`);
  return data?.message ?? 'ok';
}

export async function markAllNotificationsAsRead(): Promise<string> {
  const { data } = await api.patch<{ message: string }>(`${BASE}/read-all`);
  return data?.message ?? 'ok';
}
