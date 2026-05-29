import type { Request, Response } from "express";
import { TeamFollower } from "../models/TeamFollower";
import { Team } from "../models/Team";

export class TeamFollowerController {
  static follow = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId);
    const userId = (req as any).user!.id;

    const team = await Team.findByPk(teamId, { attributes: ["id", "name"] });
    if (!team) {
      res.status(404).json({ error: "Equipo no encontrado" });
      return;
    }

    const [follower, created] = await TeamFollower.findOrCreate({
      where: { userId, teamId },
    });

    res.status(created ? 201 : 200).json({
      following: true,
      teamId,
      since: follower.createdAt,
    });
  };

  static unfollow = async (req: Request, res: Response): Promise<void> => {
    const teamId = Number(req.params.teamId);
    const userId = (req as any).user!.id;

    const deleted = await TeamFollower.destroy({ where: { userId, teamId } });
    res.json({ following: false, removed: deleted });
  };

  static listFollowed = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;

    const rows = await TeamFollower.findAll({
      where: { userId },
      include: [{ model: Team, attributes: ["id", "name", "logoUrl"] }],
      order: [["createdAt", "DESC"]],
    });

    res.json(
      rows.map((r) => ({
        teamId: r.teamId,
        team: (r as any).team,
        since: r.createdAt,
      }))
    );
  };

  /** Devuelve los IDs de equipos seguidos por el usuario actual (para el botón). */
  static getFollowedTeamIds = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;
    const rows = await TeamFollower.findAll({
      where: { userId },
      attributes: ["teamId"],
    });
    res.json(rows.map((r) => r.teamId));
  };
}

