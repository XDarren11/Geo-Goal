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
