import { AppError } from "../types/errors";
import { Op } from "sequelize";
import { Match } from "../models/Match";
import { Season } from "../models/Season";
import { MatchDetail } from "../models/MatchDetail";
import { League } from "../models/League";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { Field } from "../models/Field";
import { TeamMember } from "../models/TeamMember";
import { MatchSquadPlayer } from "../models/MatchSquadPlayer";
import { NotificationService } from "./NotificationService";

type LineupEntry = Record<string, unknown>;

type UpsertMatchDetailInput = {
  kickoffTime?: Date | null;
  durationMinutes?: number;
  endTime?: Date | null;
  matchDay?: string | null;
  fieldId?: number | null;
  homeCoachId?: number | null;
  awayCoachId?: number | null;
  homeStartingXI?: LineupEntry[];
  awayStartingXI?: LineupEntry[];
  homeBench?: LineupEntry[];
  awayBench?: LineupEntry[];
  homeUnavailable?: LineupEntry[];
  awayUnavailable?: LineupEntry[];
  referee?: string | null;
  weather?: string | null;
  attendance?: number | null;
  notes?: string | null;
};

type SquadRole = "starter" | "bench" | "roster" | "unavailable";

type ParsedSquadEntry = {
  playerId: number;
  playerName: string | null;
  jerseyNumber: number | null;
  position: string | null;
  isCaptain: boolean;
  minutesPlanned: number | null;
  notes: string | null;
};

export class MatchDetailService {
  private static async resolveActiveSeasonIdForLeague(leagueId: number): Promise<number | null> {
    const activeSeason = await Season.findOne({
      where: { leagueId, status: "active" },
      attributes: ["id"],
      order: [["id", "DESC"]],
    });

    return activeSeason?.id ?? null;
  }

  private static validateLineups(input: UpsertMatchDetailInput): void {
    const checkArray = (value: unknown, label: string, max: number) => {
      if (value === undefined) return;
      if (!Array.isArray(value)) {
        throw new AppError(400, `${label} debe ser un arreglo`);
      }
      if (value.length > max) {
        throw new AppError(400, `${label} supera el máximo permitido (${max})`);
      }
    };

    checkArray(input.homeStartingXI, "Titulares local", 11);
    checkArray(input.awayStartingXI, "Titulares visitante", 11);
    checkArray(input.homeBench, "Banca local", 20);
    checkArray(input.awayBench, "Banca visitante", 20);
    checkArray(input.homeUnavailable, "No disponibles local", 30);
    checkArray(input.awayUnavailable, "No disponibles visitante", 30);

    if (
      input.durationMinutes !== undefined &&
      (Number.isNaN(Number(input.durationMinutes)) || Number(input.durationMinutes) <= 0)
    ) {
      throw new AppError(400, "La duración debe ser un número positivo");
    }

    if (
      input.attendance !== undefined &&
      input.attendance !== null &&
      (Number.isNaN(Number(input.attendance)) || Number(input.attendance) < 0)
    ) {
      throw new AppError(400, "La asistencia no puede ser negativa");
    }
  }

  private static validateCoachLineup(
    input: {
      startingXI: LineupEntry[];
      bench?: LineupEntry[];
      unavailable?: LineupEntry[];
    },
    expectedStarters: number
  ): void {
    if (!Array.isArray(input.startingXI)) {
      throw new AppError(400, "Titulares debe ser un arreglo");
    }

    if (input.startingXI.length !== expectedStarters) {
      throw new AppError(409, `Debes registrar ${expectedStarters} titulares para esta liga`);
    }

    const checkOptional = (value: unknown, label: string, max: number) => {
      if (value === undefined) return;
      if (!Array.isArray(value)) {
        throw new AppError(400, `${label} debe ser un arreglo`);
      }
      if (value.length > max) {
        throw new AppError(400, `${label} supera el máximo permitido (${max})`);
      }
    };

    checkOptional(input.bench, "Banca", 20);
    checkOptional(input.unavailable, "No disponibles", 30);
  }

  private static async ensureForeignKeys(input: UpsertMatchDetailInput): Promise<void> {
    if (input.fieldId !== undefined && input.fieldId !== null) {
      const field = await Field.findByPk(input.fieldId);
      if (!field) throw new AppError(404, "Campo no encontrado");
    }

    if (input.homeCoachId !== undefined && input.homeCoachId !== null) {
      const coach = await User.findByPk(input.homeCoachId);
      if (!coach) throw new AppError(404, "Entrenador local no encontrado");
    }

    if (input.awayCoachId !== undefined && input.awayCoachId !== null) {
      const coach = await User.findByPk(input.awayCoachId);
      if (!coach) throw new AppError(404, "Entrenador visitante no encontrado");
    }
  }

  private static extractPlayerId(entry: LineupEntry): number | null {
    const row = entry as Record<string, any>;
    const maybeId =
      row.playerId ??
      row.userId ??
      row.id ??
      row.player?.id ??
      row.user?.id;

    const parsed = Number(maybeId);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
  }

  private static parseSquadEntries(entries: LineupEntry[] | undefined, label: string): ParsedSquadEntry[] {
    if (!entries) return [];

    return entries.map((entry, idx) => {
      const playerId = this.extractPlayerId(entry);
      if (!playerId) {
        throw new AppError(400, `${label}: jugador inválido en posición ${idx + 1}`);
      }

      const jerseyRaw = entry.jerseyNumber;
      const jerseyNumber =
        jerseyRaw === undefined || jerseyRaw === null || Number.isNaN(Number(jerseyRaw))
          ? null
          : Number(jerseyRaw);

      const minutesRaw = entry.minutesPlanned;
      const minutesPlanned =
        minutesRaw === undefined || minutesRaw === null || Number.isNaN(Number(minutesRaw))
          ? null
          : Number(minutesRaw);

      return {
        playerId,
        playerName: typeof entry.playerName === "string" ? entry.playerName.trim() || null : null,
        jerseyNumber,
        position: typeof entry.position === "string" ? entry.position : null,
        isCaptain: Boolean(entry.isCaptain),
        minutesPlanned,
        notes: typeof entry.notes === "string" ? entry.notes : null,
      };
    });
  }

  private static async syncTeamSquad(params: {
    matchId: number;
    teamId: number;
    actorUserId: number;
    starters?: LineupEntry[];
    bench?: LineupEntry[];
    unavailable?: LineupEntry[];
  }): Promise<void> {
    const { matchId, teamId, actorUserId } = params;

    const teamMembers = await TeamMember.findAll({
      where: { teamId },
      attributes: ["userId", "playerName", "jerseyNumber", "preferredPosition"],
    });

    const memberMap = new Map<number, TeamMember>();
    teamMembers.forEach((member) => memberMap.set(Number(member.userId), member));

    const rosterPlayerIds = Array.from(new Set(teamMembers.map((member) => Number(member.userId))));
    const rosterSet = new Set<number>(rosterPlayerIds);

    const starters = this.parseSquadEntries(params.starters, "Titulares");
    const bench = this.parseSquadEntries(params.bench, "Banca");
    const unavailable = this.parseSquadEntries(params.unavailable, "No disponibles");

    const roleByPlayer = new Map<number, { role: SquadRole; data: ParsedSquadEntry }>();

    const assignRole = (items: ParsedSquadEntry[], role: SquadRole, label: string) => {
      for (const item of items) {
        if (!rosterSet.has(item.playerId)) {
          throw new AppError(400, `${label}: el jugador ${item.playerId} no pertenece al equipo ${teamId}`);
        }
        if (roleByPlayer.has(item.playerId)) {
          throw new AppError(400, `Jugador ${item.playerId} repetido en distintas listas de convocatoria`);
        }
        roleByPlayer.set(item.playerId, { role, data: item });
      }
    };

    assignRole(starters, "starter", "Titulares");
    assignRole(bench, "bench", "Banca");
    assignRole(unavailable, "unavailable", "No disponibles");

    if (!rosterPlayerIds.length) {
      await MatchSquadPlayer.destroy({ where: { matchId, teamId } });
      return;
    }

    await MatchSquadPlayer.destroy({
      where: {
        matchId,
        teamId,
        playerId: { [Op.notIn]: rosterPlayerIds },
      },
    });

    const rows = rosterPlayerIds.map((playerId) => {
      const mapped = roleByPlayer.get(playerId);
      const role: SquadRole = mapped?.role ?? "roster";
      const meta = mapped?.data;
      const membership = memberMap.get(playerId);

      return {
        matchId,
        teamId,
        playerId,
        squadRole: role,
        isAvailable: role !== "unavailable",
        isCaptain: meta?.isCaptain ?? false,
        jerseyNumber: meta?.jerseyNumber ?? membership?.jerseyNumber ?? null,
        position: meta?.position ?? membership?.preferredPosition ?? null,
        minutesPlanned: meta?.minutesPlanned ?? null,
        notes: meta?.notes ?? meta?.playerName ?? membership?.playerName ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      };
    });

    await MatchSquadPlayer.bulkCreate(rows, {
      updateOnDuplicate: [
        "squadRole",
        "isAvailable",
        "isCaptain",
        "jerseyNumber",
        "position",
        "minutesPlanned",
        "notes",
        "updatedBy",
        "updatedAt",
      ],
    });
  }

  private static async getStructuredSquads(match: Match) {
    const squadRows = await MatchSquadPlayer.findAll({
      where: { matchId: match.id },
      include: [{ model: User, as: "player", attributes: ["id", "name", "email", "role"] }],
      order: [["teamId", "ASC"], ["squadRole", "ASC"], ["id", "ASC"]],
    });

    const membershipRows = await TeamMember.findAll({
      where: {
        teamId: { [Op.in]: [match.homeTeamId, match.awayTeamId] },
      },
      attributes: ["teamId", "userId", "playerName", "jerseyNumber", "preferredPosition"],
    });

    const membershipMap = new Map<string, TeamMember>();
    membershipRows.forEach((row) => {
      membershipMap.set(`${row.teamId}:${row.userId}`, row);
    });

    const toPayload = (teamId: number) => {
      const teamRows = squadRows.filter((row) => row.teamId === teamId);

      const players = teamRows.map((row) => {
        const membership = membershipMap.get(`${teamId}:${row.playerId}`);

        return {
          id: row.playerId,
          name: membership?.playerName ?? row.player?.name ?? null,
          email: row.player?.email ?? null,
          role: row.player?.role ?? null,
          squadRole: row.squadRole,
          isAvailable: row.isAvailable,
          isCaptain: row.isCaptain,
          jerseyNumber: row.jerseyNumber ?? membership?.jerseyNumber ?? null,
          position: row.position ?? membership?.preferredPosition ?? null,
          minutesPlanned: row.minutesPlanned,
          notes: row.notes,
        };
      });

      return {
        starters: players.filter((p) => p.squadRole === "starter"),
        bench: players.filter((p) => p.squadRole === "bench"),
        roster: players.filter((p) => p.squadRole === "roster"),
        unavailable: players.filter((p) => p.squadRole === "unavailable"),
        totals: {
          totalRoster: players.length,
          available: players.filter((p) => p.isAvailable).length,
          unavailable: players.filter((p) => !p.isAvailable).length,
        },
      };
    };

    return {
      home: toPayload(match.homeTeamId),
      away: toPayload(match.awayTeamId),
    };
  }

  static async getByMatchId(matchId: string) {
    const match = await Match.findByPk(matchId, {
      include: [
        {
          model: League,
          attributes: ["id", "name", "lineupMode"],
        },
        {
          model: Team,
          as: "homeTeam",
          attributes: ["id", "name", "logoUrl", "trainerId"],
          include: [
            {
              model: User,
              as: "trainer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
        {
          model: Team,
          as: "awayTeam",
          attributes: ["id", "name", "logoUrl", "trainerId"],
          include: [
            {
              model: User,
              as: "trainer",
              attributes: ["id", "name", "email"],
            },
          ],
        },
      ],
    });

    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    const detail = await MatchDetail.findOne({
      where: { matchId: Number(matchId) },
      include: [
        { model: Field, attributes: ["id", "name", "address", "city", "state", "country","lat","lng"] },
        { model: User, as: "homeCoach", attributes: ["id", "name", "email"] },
        { model: User, as: "awayCoach", attributes: ["id", "name", "email"] },
      ],
    });

    const kickoff = detail?.kickoffTime ?? match.date ?? null;
    const durationMinutes = detail?.durationMinutes ?? 90;
    const computedEnd =
      detail?.endTime ??
      (kickoff
        ? new Date(new Date(kickoff).getTime() + durationMinutes * 60 * 1000)
        : null);

    const squads = await this.getStructuredSquads(match);

    return {
      match,
      detail: {
        ...detail?.toJSON(),
        kickoffTime: kickoff,
        durationMinutes,
        endTime: computedEnd,
        matchDay: detail?.matchDay ?? (match.date ? new Date(match.date).toISOString().slice(0, 10) : null),
        homeCoach: detail?.homeCoach ?? (match.homeTeam as Team)?.trainer ?? null,
        awayCoach: detail?.awayCoach ?? (match.awayTeam as Team)?.trainer ?? null,
        homeFormation: detail?.homeFormation ?? null,
        awayFormation: detail?.awayFormation ?? null,
        squads,
      },
    };
  }

  static async upsertByMatchId(
    matchId: string,
    actorUserId: number,
    input: UpsertMatchDetailInput
  ) {
    const match = await Match.findByPk(matchId);
    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    if (
      input.kickoffTime !== undefined &&
      match.date &&
      new Date(match.date).getTime() < Date.now()
    ) {
      throw new AppError(
        409,
        "No se puede cambiar la fecha de un partido cuya fecha/hora ya pasó"
      );
    }

    this.validateLineups(input);
    await this.ensureForeignKeys(input);

    const parsedKickoff =
      input.kickoffTime === undefined
        ? undefined
        : input.kickoffTime === null
          ? null
          : new Date(input.kickoffTime);

    const parsedEndTime =
      input.endTime === undefined
        ? undefined
        : input.endTime === null
          ? null
          : new Date(input.endTime);

    const [detail, created] = await MatchDetail.findOrCreate({
      where: { matchId: Number(matchId) },
      defaults: {
        matchId: Number(matchId),
        kickoffTime: parsedKickoff ?? match.date ?? null,
        durationMinutes: input.durationMinutes ?? 90,
        endTime: parsedEndTime ?? null,
        matchDay: input.matchDay ?? (match.date ? new Date(match.date).toISOString().slice(0, 10) : null),
        fieldId: input.fieldId ?? null,
        homeCoachId: input.homeCoachId ?? null,
        awayCoachId: input.awayCoachId ?? null,
        homeStartingXI: input.homeStartingXI ?? [],
        awayStartingXI: input.awayStartingXI ?? [],
        homeBench: input.homeBench ?? [],
        awayBench: input.awayBench ?? [],
        referee: input.referee ?? null,
        weather: input.weather ?? null,
        attendance: input.attendance ?? null,
        notes: input.notes ?? null,
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    if (!created) {
      if (parsedKickoff !== undefined) detail.kickoffTime = parsedKickoff;
      if (input.durationMinutes !== undefined) detail.durationMinutes = input.durationMinutes;
      if (parsedEndTime !== undefined) detail.endTime = parsedEndTime;
      if (input.matchDay !== undefined) detail.matchDay = input.matchDay;
      if (input.fieldId !== undefined) detail.fieldId = input.fieldId;
      if (input.homeCoachId !== undefined) detail.homeCoachId = input.homeCoachId;
      if (input.awayCoachId !== undefined) detail.awayCoachId = input.awayCoachId;
      if (input.homeStartingXI !== undefined) detail.homeStartingXI = input.homeStartingXI;
      if (input.awayStartingXI !== undefined) detail.awayStartingXI = input.awayStartingXI;
      if (input.homeBench !== undefined) detail.homeBench = input.homeBench;
      if (input.awayBench !== undefined) detail.awayBench = input.awayBench;
      if (input.referee !== undefined) detail.referee = input.referee;
      if (input.weather !== undefined) detail.weather = input.weather;
      if (input.attendance !== undefined) detail.attendance = input.attendance;
      if (input.notes !== undefined) detail.notes = input.notes;
      detail.updatedBy = actorUserId;
      await detail.save();
    }

    const shouldSyncHomeSquad =
      created ||
      input.homeStartingXI !== undefined ||
      input.homeBench !== undefined ||
      input.homeUnavailable !== undefined;

    const shouldSyncAwaySquad =
      created ||
      input.awayStartingXI !== undefined ||
      input.awayBench !== undefined ||
      input.awayUnavailable !== undefined;

    if (shouldSyncHomeSquad) {
      await this.syncTeamSquad({
        matchId: match.id,
        teamId: match.homeTeamId,
        actorUserId,
        starters: input.homeStartingXI ?? (detail.homeStartingXI as LineupEntry[]),
        bench: input.homeBench ?? (detail.homeBench as LineupEntry[]),
        unavailable: input.homeUnavailable ?? [],
      });
    }

    if (shouldSyncAwaySquad) {
      await this.syncTeamSquad({
        matchId: match.id,
        teamId: match.awayTeamId,
        actorUserId,
        starters: input.awayStartingXI ?? (detail.awayStartingXI as LineupEntry[]),
        bench: input.awayBench ?? (detail.awayBench as LineupEntry[]),
        unavailable: input.awayUnavailable ?? [],
      });
    }

    if (parsedKickoff !== undefined) {
      if (match.seasonId == null && parsedKickoff != null) {
        const activeSeasonId = await this.resolveActiveSeasonIdForLeague(match.leagueId);
        if (activeSeasonId != null) {
          match.seasonId = activeSeasonId;
        }
      }

      match.date = parsedKickoff;
      await match.save();

      if (parsedKickoff) {
        await NotificationService.notifyMatchScheduled(match.id, parsedKickoff);
      }
    }

    const reloaded = await this.getByMatchId(matchId);
    return {
      message: created
        ? "Detalle de partido creado correctamente"
        : "Detalle de partido actualizado correctamente",
      data: reloaded,
    };
  }

  static async upsertCoachLineup(
    matchId: string,
    actorUserId: number,
    input: {
      startingXI: LineupEntry[];
      bench?: LineupEntry[];
      unavailable?: LineupEntry[];
      formation?: string;
    }
  ) {
    const match = await Match.findByPk(matchId);
    if (!match) {
      throw new AppError(404, "Partido no encontrado");
    }

    const league = await League.findByPk(match.leagueId, {
      attributes: ["id", "lineupMode"],
    });
    const expectedStarters = Number(league?.lineupMode);
    if (!league || ![7, 11].includes(expectedStarters)) {
      throw new AppError(409, "La liga debe definir si el formato es 7 u 11");
    }

    this.validateCoachLineup(input, expectedStarters);

    const teams = await Team.findAll({
      where: { id: [match.homeTeamId, match.awayTeamId] },
      attributes: ["id", "trainerId"],
    });

    const homeTeam = teams.find((t) => Number(t.id) === match.homeTeamId);
    const awayTeam = teams.find((t) => Number(t.id) === match.awayTeamId);
    const isHomeCoach = homeTeam?.trainerId === actorUserId;
    const isAwayCoach = awayTeam?.trainerId === actorUserId;

    if (!isHomeCoach && !isAwayCoach) {
      throw new AppError(403, "No tienes permisos para actualizar la alineación");
    }

    const side = isHomeCoach ? "home" : "away";
    const teamId = isHomeCoach ? match.homeTeamId : match.awayTeamId;
    const kickoff = match.date ? new Date(match.date) : null;

    const [detail] = await MatchDetail.findOrCreate({
      where: { matchId: match.id },
      defaults: {
        matchId: match.id,
        kickoffTime: kickoff,
        durationMinutes: 90,
        endTime: kickoff ? new Date(kickoff.getTime() + 90 * 60 * 1000) : null,
        matchDay: kickoff ? kickoff.toISOString().slice(0, 10) : null,
        homeStartingXI: [],
        awayStartingXI: [],
        homeBench: [],
        awayBench: [],
        createdBy: actorUserId,
        updatedBy: actorUserId,
      },
    });

    if (side === "home") {
      detail.homeStartingXI = input.startingXI;
      if (input.bench !== undefined) detail.homeBench = input.bench;
      if (input.formation !== undefined) detail.homeFormation = input.formation;
    } else {
      detail.awayStartingXI = input.startingXI;
      if (input.bench !== undefined) detail.awayBench = input.bench;
      if (input.formation !== undefined) detail.awayFormation = input.formation;
    }

    if (!detail.createdBy) detail.createdBy = actorUserId;
    detail.updatedBy = actorUserId;
    await detail.save();

    await this.syncTeamSquad({
      matchId: match.id,
      teamId,
      actorUserId,
      starters: input.startingXI,
      bench:
        input.bench ??
        (side === "home"
          ? (detail.homeBench as LineupEntry[])
          : (detail.awayBench as LineupEntry[])),
      unavailable: input.unavailable ?? [],
    });

    await NotificationService.notifyLineupUpdated(match.id, teamId);

    // ── Notificación: lineup publicada → followers del equipo ──────────────
    setImmediate(async () => {
      try {
        const fullMatch = await Match.findByPk(match.id, {
          include: [
            { model: Team, as: "homeTeam", attributes: ["id", "name"] },
            { model: Team, as: "awayTeam", attributes: ["id", "name"] },
          ],
        });
        if (!fullMatch) return;
        const teamName = side === "home"
          ? ((fullMatch as any).homeTeam?.name ?? "Local")
          : ((fullMatch as any).awayTeam?.name ?? "Visitante");
        const rivalName = side === "home"
          ? ((fullMatch as any).awayTeam?.name ?? "Visitante")
          : ((fullMatch as any).homeTeam?.name ?? "Local");
        await NotificationService.broadcastToTeamFollowers(teamId, {
          type: "lineup_published",
          title: `Alineación lista: ${teamName}`,
          message: `Para el partido vs ${rivalName}`,
          payload: { matchId: fullMatch.id, teamId, side },
        });
      } catch (err) {
        console.error("[notif] lineup_published broadcast failed:", err);
      }
    });

    const reloaded = await this.getByMatchId(matchId);
    return {
      message: "Alineación inicial registrada correctamente",
      data: reloaded,
    };
  }
}
