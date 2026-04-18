import type { RequestHandler } from "../../../mediator/RequestHandler";
import type { ITeamInvitationService } from "../../../../services/contracts/ITeamInvitationService";
import {
  GenerateTeamInvitationRequest,
  GetTeamInvitationRequest,
  JoinTeamByCodeRequest,
  RevokeTeamInvitationRequest,
} from "../requests/TeamInvitationRequests";

export class GenerateTeamInvitationHandler
  implements RequestHandler<GenerateTeamInvitationRequest, { code: string; expiresAt: Date | null }>
{
  constructor(private readonly svc: ITeamInvitationService) {}
  handle(
    request: GenerateTeamInvitationRequest
  ): Promise<{ code: string; expiresAt: Date | null }> {
    return this.svc.generateInvitationCode(
      request.teamId,
      request.userId,
      request.expiresIn
    );
  }
}

export class GetTeamInvitationHandler implements RequestHandler<GetTeamInvitationRequest, unknown> {
  constructor(private readonly svc: ITeamInvitationService) {}
  handle(request: GetTeamInvitationRequest): Promise<unknown> {
    return this.svc.getInvitationCode(request.teamId, request.userId);
  }
}

export class JoinTeamByCodeHandler implements RequestHandler<JoinTeamByCodeRequest, string> {
  constructor(private readonly svc: ITeamInvitationService) {}
  handle(request: JoinTeamByCodeRequest): Promise<string> {
    return this.svc.joinTeamByCode(
      request.code,
      request.userId,
      request.playerName,
      request.jerseyNumber
    );
  }
}

export class RevokeTeamInvitationHandler implements RequestHandler<RevokeTeamInvitationRequest, string> {
  constructor(private readonly svc: ITeamInvitationService) {}
  handle(request: RevokeTeamInvitationRequest): Promise<string> {
    return this.svc.revokeInvitationCode(request.teamId, request.userId);
  }
}
