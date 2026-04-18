import type { RequestHandler } from "../../mediator/RequestHandler";
import type { ITeamService } from "../../../services/contracts/ITeamService";
import {
  AddPlayerToTeamRequest,
  CreateTeamRequest,
  DeleteTeamRequest,
  FindPlayerRequest,
  GetCoachActiveLeaguesRequest,
  GetCoachDashboardRequest,
  GetMyTeamsRequest,
  GetPlayerDashboardRequest,
  GetPlayerTeamsRequest,
  GetPlayersTeamRequest,
  GetTeamByIdRequest,
  GetTeamDashboardRequest,
  RemovePlayerFromTeamRequest,
  UpdateTeamRequest,
} from "../requests/TeamRequests";

export class GetPlayerDashboardHandler
  implements RequestHandler<GetPlayerDashboardRequest, unknown>
{
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetPlayerDashboardRequest): Promise<unknown> {
    return this.svc.getPlayerDashboard(request.userId);
  }
}

export class GetCoachDashboardHandler
  implements RequestHandler<GetCoachDashboardRequest, unknown>
{
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetCoachDashboardRequest): Promise<unknown> {
    return this.svc.getCoachDashboard(request.userId);
  }
}

export class GetMyTeamsHandler implements RequestHandler<GetMyTeamsRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetMyTeamsRequest): Promise<unknown> {
    return this.svc.getMyTeams(request.userId);
  }
}

export class GetPlayerTeamsHandler implements RequestHandler<GetPlayerTeamsRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetPlayerTeamsRequest): Promise<unknown> {
    return this.svc.getPlayerTeams(request.userId);
  }
}

export class GetTeamByIdHandler implements RequestHandler<GetTeamByIdRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetTeamByIdRequest): Promise<unknown> {
    return this.svc.getTeamById(request.teamId, request.userId, request.role);
  }
}

export class CreateTeamHandler implements RequestHandler<CreateTeamRequest, string> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: CreateTeamRequest): Promise<string> {
    return this.svc.createTeam(request.trainerId, request.payload);
  }
}

export class UpdateTeamHandler implements RequestHandler<UpdateTeamRequest, string> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: UpdateTeamRequest): Promise<string> {
    return this.svc.updateTeam(request.teamId, request.trainerId, request.payload);
  }
}

export class DeleteTeamHandler implements RequestHandler<DeleteTeamRequest, string> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: DeleteTeamRequest): Promise<string> {
    return this.svc.deleteTeam(request.teamId, request.trainerId);
  }
}

export class FindPlayerHandler implements RequestHandler<FindPlayerRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: FindPlayerRequest): Promise<unknown> {
    return this.svc.findPlayer(request.teamId, request.trainerId, request.email);
  }
}

export class AddPlayerToTeamHandler implements RequestHandler<AddPlayerToTeamRequest, string> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: AddPlayerToTeamRequest): Promise<string> {
    return this.svc.addPlayerToTeam(request.teamId, request.trainerId, request.playerId);
  }
}

export class GetPlayersTeamHandler implements RequestHandler<GetPlayersTeamRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetPlayersTeamRequest): Promise<unknown> {
    return this.svc.getPlayersTeam(request.teamId, request.userId, request.role);
  }
}

export class RemovePlayerFromTeamHandler
  implements RequestHandler<RemovePlayerFromTeamRequest, string>
{
  constructor(private readonly svc: ITeamService) {}
  handle(request: RemovePlayerFromTeamRequest): Promise<string> {
    return this.svc.removePlayerFromTeam(
      request.teamId,
      request.playerId,
      request.trainerId
    );
  }
}

export class GetCoachActiveLeaguesHandler
  implements RequestHandler<GetCoachActiveLeaguesRequest, unknown>
{
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetCoachActiveLeaguesRequest): Promise<unknown> {
    return this.svc.getCoachActiveLeagues(request.trainerId);
  }
}

export class GetTeamDashboardHandler implements RequestHandler<GetTeamDashboardRequest, unknown> {
  constructor(private readonly svc: ITeamService) {}
  handle(request: GetTeamDashboardRequest): Promise<unknown> {
    return this.svc.getTeamDashboard(request.leagueId, request.teamId);
  }
}
