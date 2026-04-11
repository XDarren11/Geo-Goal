import { Op } from "sequelize";
import { Match } from "../models/Match";
import { MatchEvent } from "../models/MatchEvent";
import { MatchSquadPlayer } from "../models/MatchSquadPlayer";
import { MatchTrackingFrame } from "../models/MatchTrackingFrame";
import { PlayerMatchStat } from "../models/PlayerMatchStat";
import { TeamMatchStat } from "../models/TeamMatchStat";
import { Team } from "../models/Team";
import { User } from "../models/User";
import { AppError } from "../types/errors";

type MutablePlayerStats = {
  matchId: number;
  teamId: number;
  playerId: number;
  minutesPlayed: number;
  passes: number;
  passesCompleted: number;
  keyPasses: number;
  shots: number;
  shotsOnTarget: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  distanceMeters: number;
  rating: number;
};

const METADATA_TRUE = new Set(["true", "1", "yes", "y"]);

function isTruthy(input: unknown): boolean {
  if (typeof input === "boolean") return input;
  if (typeof input === "number") return input > 0;
  if (typeof input === "string") return METADATA_TRUE.has(input.trim().toLowerCase());
  return false;
}

function toNumberOrNull(input: unknown): number | null {
  if (input == null) return null;
  const value = Number(input);
  return Number.isFinite(value) ? value : null;
}

function normalizeCell(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 99.999) return 99.999;
  return v;
}

export class MatchAnalyticsService {
  private static computeRating(s: MutablePlayerStats): number {
    const passAccuracy = s.passes > 0 ? s.passesCompleted / s.passes : 0;
    const score =
      5 +
      s.goals * 1.8 +
      s.assists * 1.2 +
      s.keyPasses * 0.5 +
      s.shotsOnTarget * 0.35 +
      Math.min(1.2, passAccuracy * 1.2) +
      Math.min(1.0, s.distanceMeters / 9500) -
      s.yellowCards * 0.45 -
      s.redCards * 1.6;

    return Number(Math.max(0, Math.min(10, score)).toFixed(2));
  }

  private static countLineupMinutes(squadRole: MatchSquadPlayer["squadRole"], minutesPlanned: number | null): number {
    if (typeof minutesPlanned === "number" && Number.isFinite(minutesPlanned)) {
      return Math.max(0, Math.min(130, Math.round(minutesPlanned)));
    }
    if (squadRole === "starter") return 90;
    return 0;
  }

  private static getOrInit(
    store: Map<string, MutablePlayerStats>,
    matchId: number,
    teamId: number,
    playerId: number
  ): MutablePlayerStats {
    const key = `${teamId}:${playerId}`;
    if (!store.has(key)) {
      store.set(key, {
        matchId,
        teamId,
        playerId,
        minutesPlayed: 0,
        passes: 0,
        passesCompleted: 0,
        keyPasses: 0,
        shots: 0,
        shotsOnTarget: 0,
        goals: 0,
        assists: 0,
        yellowCards: 0,
        redCards: 0,
        distanceMeters: 0,
        rating: 0,
      });
    }
    return store.get(key)!;
  }

  private static resolvePlayerId(entry: Record<string, unknown>): number | null {
    const raw = entry.userId ?? entry.playerId ?? entry.id;
    const v = Number(raw);
    return Number.isInteger(v) && v > 0 ? v : null;
  }

  private static addDistanceFromTrackingFrames(
    store: Map<string, MutablePlayerStats>,
    matchId: number,
    frames: MatchTrackingFrame[]
  ) {
    const prevPos = new Map<string, { x: number; y: number }>();

    for (const frame of frames) {
      const rows = Array.isArray(frame.players) ? frame.players : [];
      for (const rowRaw of rows) {
        const row = rowRaw as Record<string, unknown>;
        const playerId = this.resolvePlayerId(row);
        if (!playerId) continue;

        const teamId = Number(row.teamId ?? row.teamID ?? row.team_id);
        if (!Number.isInteger(teamId) || teamId <= 0) continue;

        const x = toNumberOrNull(row.x);
        const y = toNumberOrNull(row.y);
        if (x == null || y == null) continue;

        const key = `${teamId}:${playerId}`;
        const prev = prevPos.get(key);
        if (!prev) {
          prevPos.set(key, { x, y });
          this.getOrInit(store, matchId, teamId, playerId);
          continue;
        }

        const dxMeters = (x - prev.x) * 1.05;
        const dyMeters = (y - prev.y) * 0.68;
        const d = Math.sqrt(dxMeters * dxMeters + dyMeters * dyMeters);

        if (Number.isFinite(d) && d >= 0) {
          const item = this.getOrInit(store, matchId, teamId, playerId);
          item.distanceMeters += d;
        }

        prevPos.set(key, { x, y });
      }
    }
  }

  static async recalculateForMatch(matchId: number): Promise<{ rows: number }> {
    const match = await Match.findByPk(matchId);
    if (!match) throw new AppError(404, "Partido no encontrado");

    const [squadRows, eventRows, trackingRows] = await Promise.all([
      MatchSquadPlayer.findAll({
        where: { matchId },
        attributes: ["teamId", "playerId", "squadRole", "minutesPlanned"],
      }),
      MatchEvent.findAll({
        where: { matchId },
        attributes: [
          "teamId",
          "playerId",
          "eventType",
          "outcome",
          "metadata",
          "relatedPlayerId",
        ],
      }),
      MatchTrackingFrame.findAll({
        where: { matchId },
        attributes: ["players", "timestampMs"],
        order: [["timestampMs", "ASC"]],
      }),
    ]);

    const store = new Map<string, MutablePlayerStats>();

    for (const row of squadRows) {
      const item = this.getOrInit(store, matchId, row.teamId, row.playerId);
      item.minutesPlayed = this.countLineupMinutes(row.squadRole, row.minutesPlanned);
    }

    for (const event of eventRows) {
      if (!event.playerId || !event.teamId) continue;

      const item = this.getOrInit(store, matchId, event.teamId, event.playerId);
      const eventType = String(event.eventType || "").toLowerCase();
      const outcome = event.outcome ? String(event.outcome).toLowerCase() : null;
      const metadata = (event.metadata ?? {}) as Record<string, unknown>;

      if (eventType === "pass" || eventType === "key_pass") {
        item.passes += 1;
        if (outcome === "complete" || outcome === "success" || isTruthy(metadata.completed)) {
          item.passesCompleted += 1;
        }
      }

      if (eventType === "key_pass" || isTruthy(metadata.isKeyPass)) {
        item.keyPasses += 1;
      }

      if (eventType === "shot" || eventType === "goal" || eventType === "penalty_scored") {
        item.shots += 1;
      }

      if (
        eventType === "goal" ||
        eventType === "penalty_scored" ||
        outcome === "goal" ||
        isTruthy(metadata.isGoal)
      ) {
        item.goals += 1;
        const assistIdRaw = metadata.assistPlayerId ?? event.relatedPlayerId;
        const assistId = Number(assistIdRaw);
        if (Number.isInteger(assistId) && assistId > 0) {
          const assistItem = this.getOrInit(store, matchId, event.teamId, assistId);
          assistItem.assists += 1;
        }
      }

      if (eventType === "shot" && (outcome === "on_target" || outcome === "goal" || outcome === "saved")) {
        item.shotsOnTarget += 1;
      }

      if (eventType === "yellow_card") item.yellowCards += 1;
      if (eventType === "red_card") item.redCards += 1;
    }

    this.addDistanceFromTrackingFrames(store, matchId, trackingRows);

    const rows = Array.from(store.values()).map((row) => {
      const copy = { ...row };
      copy.distanceMeters = Number(copy.distanceMeters.toFixed(2));
      copy.rating = this.computeRating(copy);
      return copy;
    });

    if (!rows.length) {
      await PlayerMatchStat.destroy({ where: { matchId } });
      await TeamMatchStat.destroy({ where: { matchId } });
      return { rows: 0 };
    }

    await PlayerMatchStat.bulkCreate(rows, {
      updateOnDuplicate: [
        "minutesPlayed",
        "passes",
        "passesCompleted",
        "keyPasses",
        "shots",
        "shotsOnTarget",
        "goals",
        "assists",
        "yellowCards",
        "redCards",
        "distanceMeters",
        "rating",
        "updatedAt",
      ],
    });

    const teamStatsMap = new Map<
      number,
      {
        matchId: number;
        teamId: number;
        minutesPlayed: number;
        passes: number;
        passesCompleted: number;
        keyPasses: number;
        shots: number;
        shotsOnTarget: number;
        goals: number;
        assists: number;
        yellowCards: number;
        redCards: number;
        distanceMeters: number;
        avgRating: number;
        _players: number;
      }
    >();

    for (const row of rows) {
      if (!teamStatsMap.has(row.teamId)) {
        teamStatsMap.set(row.teamId, {
          matchId,
          teamId: row.teamId,
          minutesPlayed: 0,
          passes: 0,
          passesCompleted: 0,
          keyPasses: 0,
          shots: 0,
          shotsOnTarget: 0,
          goals: 0,
          assists: 0,
          yellowCards: 0,
          redCards: 0,
          distanceMeters: 0,
          avgRating: 0,
          _players: 0,
        });
      }

      const team = teamStatsMap.get(row.teamId)!;
      team.minutesPlayed += row.minutesPlayed;
      team.passes += row.passes;
      team.passesCompleted += row.passesCompleted;
      team.keyPasses += row.keyPasses;
      team.shots += row.shots;
      team.shotsOnTarget += row.shotsOnTarget;
      team.goals += row.goals;
      team.assists += row.assists;
      team.yellowCards += row.yellowCards;
      team.redCards += row.redCards;
      team.distanceMeters += row.distanceMeters;
      team.avgRating += row.rating;
      team._players += 1;
    }

    const teamRows = Array.from(teamStatsMap.values()).map((item) => ({
      matchId: item.matchId,
      teamId: item.teamId,
      minutesPlayed: item.minutesPlayed,
      passes: item.passes,
      passesCompleted: item.passesCompleted,
      keyPasses: item.keyPasses,
      shots: item.shots,
      shotsOnTarget: item.shotsOnTarget,
      goals: item.goals,
      assists: item.assists,
      yellowCards: item.yellowCards,
      redCards: item.redCards,
      distanceMeters: Number(item.distanceMeters.toFixed(2)),
      avgRating: Number((item._players > 0 ? item.avgRating / item._players : 0).toFixed(2)),
    }));

    await TeamMatchStat.bulkCreate(teamRows, {
      updateOnDuplicate: [
        "minutesPlayed",
        "passes",
        "passesCompleted",
        "keyPasses",
        "shots",
        "shotsOnTarget",
        "goals",
        "assists",
        "yellowCards",
        "redCards",
        "distanceMeters",
        "avgRating",
        "updatedAt",
      ],
    });

    return { rows: rows.length };
  }

  static async getMatchAnalytics(matchId: number) {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: "homeTeam", attributes: ["id", "name", "logoUrl"] },
        { model: Team, as: "awayTeam", attributes: ["id", "name", "logoUrl"] },
      ],
    });

    if (!match) throw new AppError(404, "Partido no encontrado");

    const [playerStats, teamStats, passEvents, spatialEvents, timelineEvents, trackingFrames] = await Promise.all([
      PlayerMatchStat.findAll({
        where: { matchId },
        include: [
          { model: User, as: "player", attributes: ["id", "name", "email"], required: false },
          { model: Team, attributes: ["id", "name"], required: false },
        ],
        order: [["rating", "DESC"], ["goals", "DESC"], ["assists", "DESC"]],
      }),
      TeamMatchStat.findAll({
        where: { matchId },
        include: [{ model: Team, attributes: ["id", "name"], required: false }],
        order: [["goals", "DESC"], ["avgRating", "DESC"]],
      }),
      MatchEvent.findAll({
        where: {
          matchId,
          eventType: { [Op.in]: ["pass", "key_pass"] },
          outcome: { [Op.in]: ["complete", "success"] },
          relatedPlayerId: { [Op.ne]: null },
          teamId: { [Op.ne]: null },
          playerId: { [Op.ne]: null },
        },
        attributes: ["teamId", "playerId", "relatedPlayerId"],
      }),
      MatchEvent.findAll({
        where: {
          matchId,
          xStart: { [Op.ne]: null },
          yStart: { [Op.ne]: null },
          teamId: { [Op.ne]: null },
          playerId: { [Op.ne]: null },
        },
        attributes: ["teamId", "playerId", "eventType", "xStart", "yStart"],
      }),
      MatchEvent.findAll({
        where: { matchId },
        attributes: [
          "id",
          "teamId",
          "playerId",
          "relatedPlayerId",
          "eventType",
          "minute",
          "extraMinute",
          "matchTimestampSec",
          "xStart",
          "yStart",
          "xEnd",
          "yEnd",
          "outcome",
          "source",
          "confidence",
          "metadata",
          "createdAt",
        ],
        order: [["matchTimestampSec", "ASC"], ["minute", "ASC"], ["id", "ASC"]],
        limit: 200,
      }),
      MatchTrackingFrame.findAll({
        where: { matchId },
        attributes: [
          "id",
          "timestampMs",
          "period",
          "ballX",
          "ballY",
          "ballZ",
          "players",
          "source",
          "confidence",
          "createdAt",
        ],
        order: [["timestampMs", "ASC"]],
        limit: 160,
      }),
    ]);

    const passEdgesMap = new Map<string, { teamId: number; fromPlayerId: number; toPlayerId: number; count: number }>();
    for (const row of passEvents) {
      const key = `${row.teamId}:${row.playerId}:${row.relatedPlayerId}`;
      const prev = passEdgesMap.get(key);
      if (!prev) {
        passEdgesMap.set(key, {
          teamId: Number(row.teamId),
          fromPlayerId: Number(row.playerId),
          toPlayerId: Number(row.relatedPlayerId),
          count: 1,
        });
      } else {
        prev.count += 1;
      }
    }

    const heatmapMap = new Map<string, { teamId: number; playerId: number; cells: Record<string, number> }>();
    for (const row of spatialEvents) {
      const teamId = Number(row.teamId);
      const playerId = Number(row.playerId);
      const x = normalizeCell(Number(row.xStart));
      const y = normalizeCell(Number(row.yStart));
      const cx = Math.floor(x / 10);
      const cy = Math.floor(y / 10);
      const cellKey = `${cx}:${cy}`;

      const key = `${teamId}:${playerId}`;
      if (!heatmapMap.has(key)) {
        heatmapMap.set(key, { teamId, playerId, cells: {} });
      }
      const item = heatmapMap.get(key)!;
      item.cells[cellKey] = (item.cells[cellKey] ?? 0) + 1;
    }

    return {
      match,
      summary: {
        totalPlayersWithStats: playerStats.length,
        totalPassEdges: passEdgesMap.size,
        totalSpatialEvents: spatialEvents.length,
      },
      topPlayers: playerStats.slice(0, 10),
      playerStats,
      teamStats,
      passNetwork: Array.from(passEdgesMap.values()).sort((a, b) => b.count - a.count),
      heatmaps: Array.from(heatmapMap.values()),
      timelineEvents,
      trackingFrames,
    };
  }
}
