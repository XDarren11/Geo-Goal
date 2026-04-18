import type { RequestHandler } from "../../../mediator/RequestHandler";
import type { ILeagueInvitationService } from "../../../../services/contracts/ILeagueInvitationService";
import {
  GenerateLeagueInvitationRequest,
  GetLeagueInvitationRequest,
  JoinLeagueByCodeRequest,
  RevokeLeagueInvitationRequest,
} from "../requests/LeagueInvitationRequests";

export class GenerateLeagueInvitationHandler
  implements RequestHandler<GenerateLeagueInvitationRequest, { code: string; expiresAt: Date | null }>
{
  constructor(private readonly svc: ILeagueInvitationService) {}
  handle(
    request: GenerateLeagueInvitationRequest
  ): Promise<{ code: string; expiresAt: Date | null }> {
    return this.svc.generateInvitationCode(
      request.leagueId,
      request.userId,
      request.expiresIn
    );
  }
}

export class GetLeagueInvitationHandler
  implements RequestHandler<GetLeagueInvitationRequest, unknown>
{
  constructor(private readonly svc: ILeagueInvitationService) {}
  handle(request: GetLeagueInvitationRequest): Promise<unknown> {
    return this.svc.getInvitationCode(request.leagueId, request.userId);
  }
}

export class JoinLeagueByCodeHandler implements RequestHandler<JoinLeagueByCodeRequest, string> {
  constructor(private readonly svc: ILeagueInvitationService) {}
  handle(request: JoinLeagueByCodeRequest): Promise<string> {
    return this.svc.joinLeagueByCode(
      request.code,
      request.userId,
      request.role,
      request.teamId
    );
  }
}

export class RevokeLeagueInvitationHandler
  implements RequestHandler<RevokeLeagueInvitationRequest, string>
{
  constructor(private readonly svc: ILeagueInvitationService) {}
  handle(request: RevokeLeagueInvitationRequest): Promise<string> {
    return this.svc.revokeInvitationCode(request.leagueId, request.userId);
  }
}
