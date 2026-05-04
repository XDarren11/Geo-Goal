import type { Request, Response } from "express";
import { buildTeamMediator } from "../application/team/TeamMediator";
import { TeamServiceAdapter } from "../services/TeamServiceAdapter";
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
  UpdatePlayerAvatarRequest,
  UpdatePlayerProfileRequest,
  UpdateTeamRequest,
} from "../application/team/requests/TeamRequests";

const teamMediator = buildTeamMediator(new TeamServiceAdapter());

export class TeamController {
  static getPlayerDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await teamMediator.send(new GetPlayerDashboardRequest(req.user!.id));
    res.json(data);
  };

  static getCoachDashboard = async (req: Request, res: Response): Promise<void> => {
    const data = await teamMediator.send(new GetCoachDashboardRequest(req.user!.id));
    res.json(data);
  };

  static getMyTeams = async (req: Request, res: Response): Promise<void> => {
    const data = await teamMediator.send(new GetMyTeamsRequest(req.user!.id));
    res.json(data);
  };

  static getPlayerTeams = async (req: Request, res: Response): Promise<void> => {
    const data = await teamMediator.send(new GetPlayerTeamsRequest(req.user!.id));
    res.json(data);
  };

  static getTeamById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await teamMediator.send(
      new GetTeamByIdRequest(id, req.user!.id, req.user!.role)
    );
    res.json(data);
  };

  static createTeam = async (req: Request, res: Response): Promise<void> => {
    const { name, lat, lng, fieldAddress } = req.body;
    const logoFile = req.file ?? null;
    const result = await teamMediator.send(
      new CreateTeamRequest(req.user!.id, {
        name,
        lat: Number(lat),
        lng: Number(lng),
        fieldAddress,
        logoFile,
      })
    );
    res.send(result);
  };

  static updateTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const logoFile = req.file ?? undefined;
    const result = await teamMediator.send(
      new UpdateTeamRequest(id, req.user!.id, {
        ...req.body,
        logoFile,
      })
    );
    res.send(result);
  };

  static deleteTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await teamMediator.send(new DeleteTeamRequest(id, req.user!.id));
    res.send(result);
  };

  static findPlayer = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { email } = req.body;
    const data = await teamMediator.send(new FindPlayerRequest(id, req.user!.id, email));
    res.json(data);
  };

  static addPlayerToTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { playerId } = req.body;
    const result = await teamMediator.send(
      new AddPlayerToTeamRequest(id, req.user!.id, Number(playerId))
    );
    res.send(result);
  };

  static getPlayersTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await teamMediator.send(
      new GetPlayersTeamRequest(id, req.user!.id, req.user!.role)
    );
    res.json(data);
  };

  static deletePlayerToTeam = async (req: Request, res: Response): Promise<void> => {
    const { id, playerId } = req.params;
    const result = await teamMediator.send(
      new RemovePlayerFromTeamRequest(id, playerId, req.user!.id)
    );
    res.send(result);
  };

  static getCoachActiveLeagues = async (req: Request, res: Response): Promise<void> => {
    const data = await teamMediator.send(
      new GetCoachActiveLeaguesRequest(req.user!.id)
    );
    res.json(data);
  };

  static getTeamDashboard = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const data = await teamMediator.send(new GetTeamDashboardRequest(leagueId, teamId));
    res.json(data);
  };

  static updatePlayerAvatar = async (req: Request, res: Response): Promise<void> => {
    const { id: teamId } = req.params;
    const userId = req.user!.id;
    const avatarFile = req.file ?? null;
    if (!avatarFile) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }
    const data = await teamMediator.send(
      new UpdatePlayerAvatarRequest(teamId, userId, avatarFile)
    );
    res.json(data);
  };

  static updatePlayerProfile = async (req: Request, res: Response): Promise<void> => {
    const { id: teamId } = req.params;
    const userId = req.user!.id;
    const avatarFile = req.file ?? null;
    const { playerName, jerseyNumber } = req.body;

    const data = await teamMediator.send(
      new UpdatePlayerProfileRequest(teamId, userId, {
        playerName,
        jerseyNumber: jerseyNumber != null ? Number(jerseyNumber) : undefined,
        avatarFile,
      })
    );

    res.json(data);
  };
}
