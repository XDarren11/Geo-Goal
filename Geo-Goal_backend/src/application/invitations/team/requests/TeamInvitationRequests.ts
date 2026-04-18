import type { Request } from "../../../mediator/Request";

abstract class TIRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class GenerateTeamInvitationRequest extends TIRequest<{
  code: string;
  expiresAt: Date | null;
}> {
  readonly requestName = "teamInvitation.generate";
  constructor(
    public readonly teamId: number,
    public readonly userId: number,
    public readonly expiresIn?: number
  ) {
    super();
  }
}

export class GetTeamInvitationRequest extends TIRequest<unknown> {
  readonly requestName = "teamInvitation.get";
  constructor(
    public readonly teamId: number,
    public readonly userId: number
  ) {
    super();
  }
}

export class JoinTeamByCodeRequest extends TIRequest<string> {
  readonly requestName = "teamInvitation.join";
  constructor(
    public readonly code: string,
    public readonly userId: number,
    public readonly playerName: string,
    public readonly jerseyNumber: number
  ) {
    super();
  }
}

export class RevokeTeamInvitationRequest extends TIRequest<string> {
  readonly requestName = "teamInvitation.revoke";
  constructor(
    public readonly teamId: number,
    public readonly userId: number
  ) {
    super();
  }
}
