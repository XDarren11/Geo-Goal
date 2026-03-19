import type { Request, Response } from "express";
import { LeagueService } from "../services/LeagueService";
import { Team } from "../models/Team";

/**
 * Handlers de ligas: extraen params/body y user, llaman al servicio, envían respuesta.
 */
export class LeagueController {
  static createLeague = async (req: Request, res: Response): Promise<void> => {
    const result = await LeagueService.createLeague(req.user!.id, req.body);
    res.send(result);
  };

  static getAllLeagues = async (req: Request, res: Response): Promise<void> => {
    const data = await LeagueService.getAllLeagues(req.user!.id);
    res.json(data);
  };

  static getLeagueById = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await LeagueService.getLeagueById(leagueId, req.user!.id);
    res.json(data);
  };

  static updateLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await LeagueService.updateLeague(
      leagueId,
      req.user!.id,
      req.body
    );
    res.send(result);
  };

  static deleteLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await LeagueService.deleteLeague(leagueId, req.user!.id);
    res.send(result);
  };

  static getTrainerTeams = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { email } = req.body;
    const data = await LeagueService.getTrainerTeams(
      leagueId,
      req.user!.id,
      email
    );
    res.json(data);
  };

  static addTeamToLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { teamId } = req.body;
    const result = await LeagueService.addTeamToLeague(
      leagueId,
      req.user!.id,
      teamId
    );
    res.send(result);
  };

  static getTeamsLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await LeagueService.getTeamsLeague(leagueId, req.user!.id);
    res.json(data);
  };

  static removeTeamFromLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const result = await LeagueService.removeTeamFromLeague(
      leagueId,
      teamId,
      req.user!.id
    );
    res.send(result);
  };

  static generateFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { type } = req.body;
    const data = await LeagueService.generateFixture(id, req.user!.id, type);
    res.json(data);
  };

  static getLeagueFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await LeagueService.getLeagueFixture(id);
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await LeagueService.getFixtureWithLocations(id);
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const standings = await Team.findAll({
            where: { leagueId: id },
            order: [
                ['points', 'DESC'],         // 1. Más Puntos
                ['goalDifference', 'DESC'], // 2. Mejor Diferencia de Goles
                ['goalsFor', 'DESC']        // 3. Más Goles a Favor (criterio desempate)
            ],
            attributes: ['id', 'name', 'logoUrl', 'points', 'gamesPlayed', 'wins', 'draws', 'losses', 'goalsFor', 'goalDifference']
        });

        res.json(standings);

    } catch (error) {
        res.status(500).json({ error: 'Hubo un error al obtener la tabla' });
    }
  }
}
