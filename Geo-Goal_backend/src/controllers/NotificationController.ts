import type { Request, Response } from "express";
import { buildNotificationMediator } from "../application/notification/NotificationMediator";
import { NotificationServiceAdapter } from "../services/NotificationServiceAdapter";
import {
  GetMyNotificationsRequest,
  MarkAllNotificationsReadRequest,
  MarkNotificationReadRequest,
} from "../application/notification/requests/NotificationRequests";

const notificationMediator = buildNotificationMediator(new NotificationServiceAdapter());

export class NotificationController {
  static myNotifications = async (req: Request, res: Response): Promise<void> => {
    const unreadOnly = String(req.query.unreadOnly || "false") === "true";
    const data = await notificationMediator.send(
      new GetMyNotificationsRequest(req.user!.id, unreadOnly)
    );
    res.json(data);
  };

  static markAsRead = async (req: Request, res: Response): Promise<void> => {
    const { notificationId } = req.params;
    const message = await notificationMediator.send(
      new MarkNotificationReadRequest(notificationId, req.user!.id)
    );
    res.json({ message });
  };

  static markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    const message = await notificationMediator.send(
      new MarkAllNotificationsReadRequest(req.user!.id)
    );
    res.json({ message });
  };
}
