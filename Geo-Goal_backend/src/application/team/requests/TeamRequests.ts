import type { Request } from "../../mediator/Request";
import type { CreateTeamPayload } from "../../../services/contracts/ITeamService";
import type { UploadedImageFile } from "../../../utils/supabaseStorage";

abstract class TeamReq<T> implements Request<T> {
  abstract readonly requestName: string;
}

export class GetPlayerDashboardRequest extends TeamReq<unknown> {
  readonly requestName = "team.getPlayerDashboard";
  constructor(public readonly userId: number) {
    super();
  }
}

export class GetCoachDashboardRequest extends TeamReq<unknown> {
  readonly requestName = "team.getCoachDashboard";
  constructor(public readonly userId: number) {
    super();
  }
}

export class GetMyTeamsRequest extends TeamReq<unknown> {
  readonly requestName = "team.getMyTeams";
  constructor(public readonly userId: number) {
    super();
  }
}

export class GetPlayerTeamsRequest extends TeamReq<unknown> {
  readonly requestName = "team.getPlayerTeams";
  constructor(public readonly userId: number) {
    super();
  }
}

export class GetTeamByIdRequest extends TeamReq<unknown> {
  readonly requestName = "team.getById";
  constructor(
    public readonly teamId: string,
    public readonly userId: number,
    public readonly role: string
  ) {
    super();
  }
}

export class CreateTeamRequest extends TeamReq<string> {
  readonly requestName = "team.create";
  constructor(
    public readonly trainerId: number,
    public readonly payload: CreateTeamPayload
  ) {
    super();
  }
}

export class UpdateTeamRequest extends TeamReq<string> {
  readonly requestName = "team.update";
  constructor(
    public readonly teamId: string,
    public readonly trainerId: number,
    public readonly payload: Record<string, unknown> & { logoFile?: UploadedImageFile }
  ) {
    super();
  }
}

export class DeleteTeamRequest extends TeamReq<string> {
  readonly requestName = "team.delete";
  constructor(
    public readonly teamId: string,
    public readonly trainerId: number
  ) {
    super();
  }
}

export class FindPlayerRequest extends TeamReq<unknown> {
  readonly requestName = "team.findPlayer";
  constructor(
    public readonly teamId: string,
    public readonly trainerId: number,
    public readonly email: string
  ) {
    super();
  }
}

export class AddPlayerToTeamRequest extends TeamReq<string> {
  readonly requestName = "team.addPlayer";
  constructor(
    public readonly teamId: string,
    public readonly trainerId: number,
    public readonly playerId: number
  ) {
    super();
  }
}

export class GetPlayersTeamRequest extends TeamReq<unknown> {
  readonly requestName = "team.getPlayers";
  constructor(
    public readonly teamId: string,
    public readonly userId: number,
    public readonly role: string
  ) {
    super();
  }
}

export class RemovePlayerFromTeamRequest extends TeamReq<string> {
  readonly requestName = "team.removePlayer";
  constructor(
    public readonly teamId: string,
    public readonly playerId: string,
    public readonly trainerId: number
  ) {
    super();
  }
}

export class GetCoachActiveLeaguesRequest extends TeamReq<unknown> {
  readonly requestName = "team.getCoachActiveLeagues";
  constructor(public readonly trainerId: number) {
    super();
  }
}

export class GetTeamDashboardRequest extends TeamReq<unknown> {
  readonly requestName = "team.getTeamDashboard";
  constructor(
    public readonly leagueId: string,
    public readonly teamId: string
  ) {
    super();
  }
}

export class UpdatePlayerAvatarRequest extends TeamReq<{ avatarUrl: string }> {
  readonly requestName = "team.updatePlayerAvatar";
  constructor(
    public readonly teamId: string,
    public readonly userId: number,
    public readonly avatarFile: UploadedImageFile
  ) {
    super();
  }
}

