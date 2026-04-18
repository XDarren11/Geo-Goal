import { Mediator } from "../mediator/Mediator";
import type { INotificationService } from "../../services/contracts/INotificationService";
import {
  GetMyNotificationsHandler,
  MarkAllNotificationsReadHandler,
  MarkNotificationReadHandler,
} from "./handlers/NotificationHandlers";

export function buildNotificationMediator(svc: INotificationService): Mediator {
  const m = new Mediator();
  m.register("notification.getMy", new GetMyNotificationsHandler(svc));
  m.register("notification.markRead", new MarkNotificationReadHandler(svc));
  m.register("notification.markAllRead", new MarkAllNotificationsReadHandler(svc));
  return m;
}
