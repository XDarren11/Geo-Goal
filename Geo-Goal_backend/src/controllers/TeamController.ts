import type { Request, Response } from "express";
import { TeamService } from "../services/TeamService";

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
}
