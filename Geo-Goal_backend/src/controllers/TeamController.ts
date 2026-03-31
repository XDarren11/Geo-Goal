import type { Request, Response } from "express";
import { TeamService } from "../services/TeamService";
import { League } from "../models/League";
import { Team } from "../models/Team";
import { Match } from "../models/Match";
import { Op } from 'sequelize';

/**
 * Handlers de equipos: extraen params/body y user (y file si hay upload), llaman al servicio.
 */
export class TeamController {
  static getMyTeams = async (req: Request, res: Response): Promise<void> => {
    const data = await TeamService.getMyTeams(req.user!.id);
    res.json(data);
  };

  static getTeamById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await TeamService.getTeamById(id, req.user!.id);
    res.json(data);
  };

  static createTeam = async (req: Request, res: Response): Promise<void> => {
    const { name, lat, lng, fieldAddress } = req.body;
    const logoUrl = req.file?.filename ?? null;
    const result = await TeamService.createTeam(req.user!.id, {
      name,
      lat: Number(lat),
      lng: Number(lng),
      fieldAddress,
      logoUrl,
    });
    res.send(result);
  };

  static updateTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const logoUrl = req.file?.filename ?? undefined;
    const result = await TeamService.updateTeam(id, req.user!.id, {
      ...req.body,
      logoUrl,
    });
    res.send(result);
  };

  static deleteTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const result = await TeamService.deleteTeam(id, req.user!.id);
    res.send(result);
  };

  static findPlayer = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { email } = req.body;
    const data = await TeamService.findPlayer(id, req.user!.id, email);
    res.json(data);
  };

  static addPlayerToTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { playerId } = req.body;
    const result = await TeamService.addPlayerToTeam(
      id,
      req.user!.id,
      Number(playerId)
    );
    res.send(result);
  };

  static getPlayersTeam = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await TeamService.getPlayersTeam(id, req.user!.id);
    res.json(data);
  };

  static deletePlayerToTeam = async (req: Request, res: Response): Promise<void> => {
    const { id, playerId } = req.params;
    const result = await TeamService.removePlayerFromTeam(
      id,
      playerId,
      req.user!.id
    );
    res.send(result);
  };

  static getCoachActiveLeagues = async (req: Request, res: Response) => {
    try {
        const leagues = await League.findAll({
            include: [
                {
                    model: Team,
                    where: { trainerId: req.user.id }, 
                    attributes: ['id', 'name', 'logoUrl'] 
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(leagues);

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Hubo un error al obtener tus ligas activas' });
    }
  }

  static getTeamDashboard = async (req: Request, res: Response) => {
    try {
        const { leagueId, teamId } = req.params;

        const upcomingMatches = await Match.findAll({
            where: {
                leagueId,
                played: false,
                [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
            },
            include: [
                { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logoUrl'] },
                { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logoUrl'] }
            ],
            order: [['roundName', 'ASC']], // Ordenamos de la jornada más próxima en adelante
            limit: 3
        });

        const lastMatches = await Match.findAll({
            where: {
                leagueId,
                played: true,
                [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
            },
            include: [
                { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logoUrl'] },
                { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logoUrl'] }
            ],
            order: [['updatedAt', 'DESC']], // Los más recientes primero
            limit: 3
        });

        const allPlayedMatches = await Match.findAll({
            where: {
                leagueId,
                played: true,
                [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }]
            },
            order: [['id', 'ASC']] 
        });

        const chartData = allPlayedMatches.map(match => {
            const isHome = match.homeTeamId === Number(teamId);
            
            const gf = isHome ? match.homeScore : match.awayScore;
            const gc = isHome ? match.awayScore : match.homeScore;

            const roundLabel = match.roundName.replace('Jornada ', 'J');

            return {
                round: roundLabel, // Ej: "J1"
                gf: gf,            // Ej: 3
                gc: gc             // Ej: 0
            };
        });

        res.json({
            upcomingMatches,
            lastMatches,
            chartData
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Error al obtener el dashboard del equipo' });
    }
  }
}
