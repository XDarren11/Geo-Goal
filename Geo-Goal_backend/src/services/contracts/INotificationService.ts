export interface INotificationService {
  getMyNotifications(userId: number, unreadOnly: boolean): Promise<unknown>;
  markAsRead(notificationId: string, userId: number): Promise<string>;
  markAllAsRead(userId: number): Promise<string>;
}
