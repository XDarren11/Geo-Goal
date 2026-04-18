import type { Request } from "../../mediator/Request";

abstract class NotifRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class GetMyNotificationsRequest extends NotifRequest<unknown> {
  readonly requestName = "notification.getMy";
  constructor(
    public readonly userId: number,
    public readonly unreadOnly: boolean
  ) {
    super();
  }
}

export class MarkNotificationReadRequest extends NotifRequest<string> {
  readonly requestName = "notification.markRead";
  constructor(
    public readonly notificationId: string,
    public readonly userId: number
  ) {
    super();
  }
}

export class MarkAllNotificationsReadRequest extends NotifRequest<string> {
  readonly requestName = "notification.markAllRead";
  constructor(public readonly userId: number) {
    super();
  }
}
