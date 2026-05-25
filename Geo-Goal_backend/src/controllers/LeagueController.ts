import type { Request, Response } from "express";
import { buildLeagueMediator } from "../application/league/LeagueMediator";
import { LeagueServiceAdapter } from "../services/LeagueServiceAdapter";
import {
  AddTeamToLeagueRequest,
  CreateLeagueRequest,
  DeleteLeagueRequest,
  GenerateFixtureRequest,
  GenerateSecondRoundRequest,
  GetAllLeaguesRequest,
  GetFixtureWithLocationsRequest,
  GetLeagueByIdRequest,
  GetLeagueFixtureRequest,
  GetLeagueMatchesGroupedRequest,
  GetStandingsRequest,
  GetTeamsLeagueRequest,
  GetTrainerTeamsRequest,
  RemoveTeamFromLeagueRequest,
  RestructureLeagueFixtureRequest,
  UpdateLeagueLogoRequest,
  UpdateLeagueRequest,
} from "../application/league/requests/LeagueRequests";
import { matchStatMediator } from "../application/matchStats/MatchStatMediator";
import { GetMatchPlayersRequest, GetTopScorersRequest, UpdatePlayerMatchGoalsRequest } from "../application/matchStats/MatchStatRequests";

const leagueMediator = buildLeagueMediator(new LeagueServiceAdapter());

/**
 * Handlers de ligas: extraen params/body y user, delegan al mediador y envían respuesta.
 */
export class LeagueController {
  static createLeague = async (req: Request, res: Response): Promise<void> => {
    const logoFile = req.file ?? null;
    const result = await leagueMediator.send(
      new CreateLeagueRequest(req.user!.id, {
        ...req.body,
        logoFile,
      })
    );
    res.send(result);
  };

  static getAllLeagues = async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = parseInt(req.query.pageSize as string, 10) || 50;
    const data = await leagueMediator.send(new GetAllLeaguesRequest(req.user!.id, page, pageSize));
    res.json(data);
  };

  static getLeagueById = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await leagueMediator.send(
      new GetLeagueByIdRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static updateLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new UpdateLeagueRequest(leagueId, req.user!.id, req.body)
    );
    res.send(result);
  };

  static deleteLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new DeleteLeagueRequest(leagueId, req.user!.id)
    );
    res.send(result);
  };

  static getTrainerTeams = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { email } = req.body;
    const data = await leagueMediator.send(
      new GetTrainerTeamsRequest(leagueId, req.user!.id, email)
    );
    res.json(data);
  };

  static addTeamToLeague = async (req: Request, res: Response): Promise<void> => {
    const { teamId } = req.body;
    const { leagueId } = req.params;
    const result = await leagueMediator.send(
      new AddTeamToLeagueRequest(leagueId, Number(teamId))
    );
    res.send(result);
  };

  static getTeamsLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await leagueMediator.send(
      new GetTeamsLeagueRequest(leagueId, req.user!.id)
    );
    res.json(data);
  };

  static removeTeamFromLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const result = await leagueMediator.send(
      new RemoveTeamFromLeagueRequest(leagueId, teamId, req.user!.id)
    );
    res.send(result);
  };

  static generateFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { type, scheduleStartDate, matchTime, daysBetweenRounds, matchDuration } = req.body;
    const data = await leagueMediator.send(
      new GenerateFixtureRequest(id, req.user!.id, type, {
        scheduleStartDate,
        matchTime,
        daysBetweenRounds,
        matchDuration,
      })
    );
    res.json(data);
  };

  static getLeagueFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(new GetLeagueFixtureRequest(id));
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(new GetFixtureWithLocationsRequest(id));
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new GetStandingsRequest(id, req.user?.id, req.user?.role)
    );
    res.json(data);
  };

  static getLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new GetLeagueMatchesGroupedRequest(id, req.user?.id, req.user?.role)
    );
    res.json(data);
  };

  static restructureFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await leagueMediator.send(
      new RestructureLeagueFixtureRequest(id, {
        actorUserId: req.user?.id ?? null,
        reason: req.body?.reason,
        ip: req.ip,
        userAgent: req.get("user-agent") ?? null,
      })
    );
    res.json(data);
  };

  static updateLeagueLogo = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const logoFile = req.file ?? null;
    if (!logoFile) {
      res.status(400).json({ error: "No se recibió ningún archivo" });
      return;
    }
    const data = await leagueMediator.send(
      new UpdateLeagueLogoRequest(leagueId, logoFile)
    );
    res.json(data);
  };

  static getTopScorers = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await matchStatMediator.send(new GetTopScorersRequest(Number(leagueId)));
    res.json(data);
  };

  static updateMatchGoals = async (req: Request, res: Response): Promise<void> => {
    const { matchId } = req.params;
    const { teamId, playerId, goals } = req.body;

    const data = await matchStatMediator.send(
      new UpdatePlayerMatchGoalsRequest(Number(matchId), Number(teamId), Number(playerId), Number(goals))
    );
    res.json(data);
  };

 static getMatchPlayers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { matchId } = req.params;
      const data = await matchStatMediator.send(new GetMatchPlayersRequest(Number(matchId)));
      res.json(data);
    } catch (error: any) {
      console.error("🚨🚨🚨 ERROR EN EL BACKEND:", error);
      res.status(500).json({ message: "Error interno", detail: error.message });
    }
  };
  
  static generateSecondRound = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      const data = await leagueMediator.send(new GenerateSecondRoundRequest(Number(id)));
      
      res.json(data);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  };
}

