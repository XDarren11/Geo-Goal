import type { Request } from "../../../mediator/Request";

abstract class LIRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class GenerateLeagueInvitationRequest extends LIRequest<{
  code: string;
  expiresAt: Date | null;
}> {
  readonly requestName = "leagueInvitation.generate";
  constructor(
    public readonly leagueId: number,
    public readonly userId: number,
    public readonly expiresIn?: number
  ) {
    super();
  }
}

export class GetLeagueInvitationRequest extends LIRequest<unknown> {
  readonly requestName = "leagueInvitation.get";
  constructor(
    public readonly leagueId: number,
    public readonly userId: number
  ) {
    super();
  }
}

export class JoinLeagueByCodeRequest extends LIRequest<string> {
  readonly requestName = "leagueInvitation.join";
  constructor(
    public readonly code: string,
    public readonly userId: number,
    public readonly role: string,
    public readonly teamId?: number
  ) {
    super();
  }
}

export class RevokeLeagueInvitationRequest extends LIRequest<string> {
  readonly requestName = "leagueInvitation.revoke";
  constructor(
    public readonly leagueId: number,
    public readonly userId: number
  ) {
    super();
  }
}
