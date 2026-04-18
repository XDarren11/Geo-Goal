import { NotificationService } from "./NotificationService";
import type { INotificationService } from "./contracts/INotificationService";

export class NotificationServiceAdapter implements INotificationService {
  getMyNotifications(userId: number, unreadOnly: boolean): Promise<unknown> {
    return NotificationService.getMyNotifications(userId, unreadOnly);
  }

  markAsRead(notificationId: string, userId: number): Promise<string> {
    return NotificationService.markAsRead(notificationId, userId);
  }

  markAllAsRead(userId: number): Promise<string> {
    return NotificationService.markAllAsRead(userId);
  }
}
