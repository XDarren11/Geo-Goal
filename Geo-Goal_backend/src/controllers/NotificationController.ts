import type { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';

export class NotificationController {
  static myNotifications = async (req: Request, res: Response): Promise<void> => {
    const unreadOnly = String(req.query.unreadOnly || 'false') === 'true';
    const data = await NotificationService.getMyNotifications(req.user!.id, unreadOnly);
    res.json(data);
  };

  static markAsRead = async (req: Request, res: Response): Promise<void> => {
    const { notificationId } = req.params;
    const message = await NotificationService.markAsRead(notificationId, req.user!.id);
    res.json({ message });
  };

  static markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const message = await NotificationService.markAllAsRead(req.user!.id);
    res.json({ message });
  };
}
