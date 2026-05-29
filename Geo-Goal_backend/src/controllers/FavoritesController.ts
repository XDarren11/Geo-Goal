import type { Request, Response } from "express";
import { Op } from "sequelize";
import { UserFavorite, type FavoriteEntityType } from "../models/UserFavorite";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { League } from "../models/League";

const ALLOWED_TYPES: FavoriteEntityType[] = ["team", "player", "coach", "league", "admin"];

function isValidType(t: unknown): t is FavoriteEntityType {
  return typeof t === "string" && (ALLOWED_TYPES as string[]).includes(t);
}

/** Hidrata los favoritos con la info mínima de cada entidad para mostrar en menú lateral. */
async function hydrate(favorites: UserFavorite[]) {
  const teamIds = favorites.filter((f) => f.entityType === "team").map((f) => f.entityId);
  const userIds = favorites
    .filter((f) => f.entityType === "player" || f.entityType === "coach")
    .map((f) => f.entityId);
  const leagueIds = favorites.filter((f) => f.entityType === "league").map((f) => f.entityId);

  const [teams, users, leagues] = await Promise.all([
    teamIds.length
      ? Team.findAll({ where: { id: { [Op.in]: teamIds } }, attributes: ["id", "name", "logoUrl"] })
      : Promise.resolve([] as Team[]),
    userIds.length
      ? User.findAll({ where: { id: { [Op.in]: userIds } }, attributes: ["id", "name", "username"] })
      : Promise.resolve([] as User[]),
    leagueIds.length
      ? League.findAll({ where: { id: { [Op.in]: leagueIds } }, attributes: ["id", "name", "logoUrl"] })
      : Promise.resolve([] as League[]),
  ]);

  const teamMap = new Map(teams.map((t) => [t.id, t]));
  const userMap = new Map(users.map((u) => [u.id, u]));
  const leagueMap = new Map(leagues.map((l) => [l.id, l]));

  return favorites.map((f) => {
    let display: { id: number; name: string; avatarUrl?: string | null; username?: string | null } | null = null;
    if (f.entityType === "team") {
      const t = teamMap.get(f.entityId);
      if (t) display = { id: t.id, name: t.name, avatarUrl: (t as any).logoUrl ?? null };
    } else if (f.entityType === "player" || f.entityType === "coach") {
      const u = userMap.get(f.entityId);
      if (u) display = { id: u.id, name: u.name, username: u.username ?? null };
    } else if (f.entityType === "league") {
      const l = leagueMap.get(f.entityId);
      if (l) display = { id: l.id, name: l.name, avatarUrl: (l as any).logoUrl ?? null };
    }

    return {
      id: f.id,
      entityType: f.entityType,
      entityId: f.entityId,
      label: f.label ?? null,
      sortOrder: f.sortOrder,
      createdAt: f.createdAt,
      display,
    };
  });
}

export class FavoritesController {
  /** GET /api/account/favorites — lista los favoritos del usuario logueado, ordenados. */
  static list = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;
    const typeFilter = req.query.type as string | undefined;

    const where: any = { userId };
    if (typeFilter && isValidType(typeFilter)) {
      where.entityType = typeFilter;
    }

    const favs = await UserFavorite.findAll({
      where,
      order: [
        ["sortOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    const hydrated = await hydrate(favs);
    res.json(hydrated);
  };

  /** GET /api/account/favorites/ids — solo los IDs (para botones toggle). */
  static listIds = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;
    const favs = await UserFavorite.findAll({
      where: { userId },
      attributes: ["entityType", "entityId"],
    });
    res.json(
      favs.map((f) => ({
        entityType: f.entityType,
        entityId: f.entityId,
      }))
    );
  };

  /**
   * POST /api/account/favorites
   * Body: { entityType, entityId, label?, sortOrder? }
   * Idempotente: si ya existe, devuelve el actual (200), si lo crea (201).
   */
  static create = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;
    const { entityType, entityId, label, sortOrder } = req.body;

    if (!isValidType(entityType)) {
      res.status(400).json({ error: `entityType inválido. Permitidos: ${ALLOWED_TYPES.join(", ")}` });
      return;
    }
    const eid = Number(entityId);
    if (!Number.isInteger(eid) || eid <= 0) {
      res.status(400).json({ error: "entityId debe ser un entero positivo" });
      return;
    }

    // Validar que la entidad referenciada existe (evita basura en BD)
    if (entityType === "team") {
      const t = await Team.findByPk(eid, { attributes: ["id"] });
      if (!t) {
        res.status(404).json({ error: "Equipo no encontrado" });
        return;
      }
    } else if (entityType === "player" || entityType === "coach") {
      const u = await User.findByPk(eid, { attributes: ["id"] });
      if (!u) {
        res.status(404).json({ error: "Usuario no encontrado" });
        return;
      }
    } else if (entityType === "league") {
      const l = await League.findByPk(eid, { attributes: ["id"] });
      if (!l) {
        res.status(404).json({ error: "Liga no encontrada" });
        return;
      }
    }

    const [fav, created] = await UserFavorite.findOrCreate({
      where: { userId, entityType, entityId: eid },
      defaults: {
        userId,
        entityType,
        entityId: eid,
        label: label ?? null,
        sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
      } as any,
    });

    // Si ya existía y nos pasaron label/sortOrder, actualizamos
    if (!created && (label !== undefined || sortOrder !== undefined)) {
      if (label !== undefined) fav.label = label;
      if (sortOrder !== undefined && Number.isInteger(sortOrder)) fav.sortOrder = sortOrder;
      await fav.save();
    }

    res.status(created ? 201 : 200).json({
      id: fav.id,
      entityType: fav.entityType,
      entityId: fav.entityId,
      label: fav.label,
      sortOrder: fav.sortOrder,
      createdAt: fav.createdAt,
    });
  };

  /**
   * DELETE /api/account/favorites?entityType=team&entityId=123
   * o     DELETE /api/account/favorites/:id
   */
  static remove = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;

    const byId = req.params.id ? Number(req.params.id) : NaN;
    if (Number.isInteger(byId) && byId > 0) {
      const deleted = await UserFavorite.destroy({ where: { id: byId, userId } });
      res.json({ removed: deleted });
      return;
    }

    const entityType = req.query.entityType as string | undefined;
    const entityId = req.query.entityId ? Number(req.query.entityId) : NaN;
    if (!isValidType(entityType) || !Number.isInteger(entityId) || entityId <= 0) {
      res.status(400).json({ error: "Especifica :id o query entityType+entityId" });
      return;
    }

    const deleted = await UserFavorite.destroy({
      where: { userId, entityType, entityId },
    });
    res.json({ removed: deleted });
  };

  /**
   * PATCH /api/account/favorites/:id
   * Body: { label?, sortOrder? }
   */
  static update = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user!.id;
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id inválido" });
      return;
    }

    const fav = await UserFavorite.findOne({ where: { id, userId } });
    if (!fav) {
      res.status(404).json({ error: "Favorito no encontrado" });
      return;
    }

    if (req.body.label !== undefined) fav.label = req.body.label;
    if (req.body.sortOrder !== undefined && Number.isInteger(Number(req.body.sortOrder))) {
      fav.sortOrder = Number(req.body.sortOrder);
    }
    await fav.save();

    res.json({
      id: fav.id,
      entityType: fav.entityType,
      entityId: fav.entityId,
      label: fav.label,
      sortOrder: fav.sortOrder,
    });
  };
}
