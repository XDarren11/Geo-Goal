import type { RequestHandler } from "../../mediator/RequestHandler";
import type { INotificationService } from "../../../services/contracts/INotificationService";
import {
  GetMyNotificationsRequest,
  MarkAllNotificationsReadRequest,
  MarkNotificationReadRequest,
} from "../requests/NotificationRequests";

export class GetMyNotificationsHandler
  implements RequestHandler<GetMyNotificationsRequest, unknown>
{
  constructor(private readonly svc: INotificationService) {}
  handle(request: GetMyNotificationsRequest): Promise<unknown> {
    return this.svc.getMyNotifications(request.userId, request.unreadOnly);
  }
}

export class MarkNotificationReadHandler
  implements RequestHandler<MarkNotificationReadRequest, string>
{
  constructor(private readonly svc: INotificationService) {}
  handle(request: MarkNotificationReadRequest): Promise<string> {
    return this.svc.markAsRead(request.notificationId, request.userId);
  }
}

export class MarkAllNotificationsReadHandler
  implements RequestHandler<MarkAllNotificationsReadRequest, string>
{
  constructor(private readonly svc: INotificationService) {}
  handle(request: MarkAllNotificationsReadRequest): Promise<string> {
    return this.svc.markAllAsRead(request.userId);
  }
}
