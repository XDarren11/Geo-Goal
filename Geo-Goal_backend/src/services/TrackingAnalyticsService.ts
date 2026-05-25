/**
 * TrackingAnalyticsService
 * Fase 2 del plan de estadísticas avanzadas.
 *
 * Computa en TypeScript puro (sin Python):
 *   - velocidades, sprints, aceleraciones (2.B)
 *   - zonas longitudinales (2.B)
 *   - heatmaps KDE 2D (2.C)
 *   - mapa de pases + PageRank (2.D)
 *   - posesión por equipo (2.E)
 *   - formación observada (2.E)
 *   - convex hull promedio (2.F)
 *   - línea defensiva promedio (2.F)
 *
 * Cachea el resultado en match_analytics_cache (JSONB). Invalida si llegan
 * frames nuevos (compara framesAtComputeTime con COUNT actual).
 */

import { MatchTrackingFrame } from "../models/MatchTrackingFrame";
import { MatchEvent } from "../models/MatchEvent";
import { MatchAnalyticsCache } from "../models/MatchAnalyticsCache";
import { Match } from "../models/Match";

// Incrementar cuando cambie el algoritmo para forzar re-cómputo.
const ANALYTICS_VERSION = 1;

// Factores de conversión de coordenadas normalizadas 0-100 → metros
const X_FACTOR = 1.05; // 105m / 100 unidades
const Y_FACTOR = 0.68; // 68m / 100 unidades

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpeedMetrics {
  avgSpeed: number;   // m/s
  maxSpeed: number;   // m/s
  sprintCount: number;
  accelerationCount: number;
  distanceM: number;  // metros totales recorridos
}

export interface ZoneMetrics {
  def: number; // metros en zona defensiva
  mid: number; // metros en zona media
  att: number; // metros en zona ofensiva
}

export interface PassNetwork {
  nodes: Array<{
    playerId: number;
    teamId: number;
    degree: number;
    pageRank: number;
    avgX: number; // posición promedio para layout del grafo
    avgY: number;
  }>;
  edges: Array<{ from: number; to: number; count: number }>;
}

export interface TrackingAnalytics {
  speeds: Record<number, SpeedMetrics>;
  zones: Record<number, ZoneMetrics>;
  heatmaps: Record<number, number[][]>; // userId → grid 21×14, valores 0-1
  passNetwork: PassNetwork;
  possession: { home: number; away: number; homeTeamId: number; awayTeamId: number };
  convexHull: { home: number; away: number }; // m² promedio por frame
  defensiveLine: { home: number; away: number }; // metros desde su portería propia
  observedFormation: { home: string; away: string };
  meta: {
    framesProcessed: number;
    homeTeamId: number;
    awayTeamId: number;
    computedAt: string;
  };
}

// Un jugador en un frame (estructura del JSONB players[])
interface RawPlayer {
  userId?: number;
  playerId?: number;
  teamId?: number;
  x?: number;
  y?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class TrackingAnalyticsService {
  // ── Caché ─────────────────────────────────────────────────────────────────

  static async getOrCompute(matchId: number): Promise<TrackingAnalytics> {
    const [cached, frameCount] = await Promise.all([
      MatchAnalyticsCache.findByPk(matchId),
      MatchTrackingFrame.count({ where: { matchId } }),
    ]);

    if (
      cached &&
      cached.version === ANALYTICS_VERSION &&
      cached.framesAtComputeTime === frameCount
    ) {
      return cached.payload as unknown as TrackingAnalytics;
    }

    const computed = await this.compute(matchId);

    await MatchAnalyticsCache.upsert({
      matchId,
      payload: computed as unknown as Record<string, unknown>,
      version: ANALYTICS_VERSION,
      computedAt: new Date(),
      framesAtComputeTime: frameCount,
    });

    return computed;
  }

  /** Invalida el cache de un partido (llamar después de nuevos frames). */
  static async invalidate(matchId: number): Promise<void> {
    await MatchAnalyticsCache.destroy({ where: { matchId } });
  }

  // ── Cómputo principal ─────────────────────────────────────────────────────

  static async compute(matchId: number): Promise<TrackingAnalytics> {
    const [frames, events, match] = await Promise.all([
      MatchTrackingFrame.findAll({
        where: { matchId },
        order: [["timestampMs", "ASC"]],
        attributes: ["timestampMs", "ballX", "ballY", "players", "coordSystem"],
      }),
      MatchEvent.findAll({ where: { matchId } }),
      Match.findByPk(matchId, { attributes: ["id", "homeTeamId", "awayTeamId"] }),
    ]);

    const homeTeamId = match?.homeTeamId ?? 0;
    const awayTeamId = match?.awayTeamId ?? 0;

    // Normalizar coordenadas a sistema 0-100 si vienen en metros
    const normalizedFrames = frames.map((f) => {
      if (f.coordSystem === "meters") {
        const players = (f.players as unknown as RawPlayer[]).map((p) => ({
          ...p,
          x: p.x != null ? (p.x / 105) * 100 : p.x,
          y: p.y != null ? (p.y / 68) * 100 : p.y,
        }));
        return { ...f.toJSON(), players } as typeof f & { players: RawPlayer[] };
      }
      return f as typeof f & { players: RawPlayer[] };
    });

    return {
      speeds: this._computeSpeeds(normalizedFrames),
      zones: this._computeZones(normalizedFrames),
      heatmaps: this._computeHeatmaps(normalizedFrames),
      passNetwork: this._computePassNetwork(events),
      possession: this._computePossession(normalizedFrames, homeTeamId, awayTeamId),
      convexHull: this._computeConvexHull(normalizedFrames, homeTeamId, awayTeamId),
      defensiveLine: this._computeDefensiveLine(normalizedFrames, homeTeamId, awayTeamId),
      observedFormation: this._computeObservedFormation(normalizedFrames, homeTeamId, awayTeamId),
      meta: {
        framesProcessed: frames.length,
        homeTeamId,
        awayTeamId,
        computedAt: new Date().toISOString(),
      },
    };
  }

  // ── 2.B Velocidades, sprints, zonas ──────────────────────────────────────

  private static _computeSpeeds(frames: Array<{ players: RawPlayer[]; timestampMs: number }>): Record<number, SpeedMetrics> {
    const SPRINT_THR = 7;      // m/s
    const SPRINT_MIN = 3;      // frames consecutive
    const ACCEL_THR = 3;       // m/s²
    const SPEED_CAP = 12;      // m/s — anti-ruido

    const last = new Map<number, { x: number; y: number; t: number; v: number }>();
    const acc: Record<number, { speeds: number[]; dist: number; sprints: number; sprintC: number; accels: number }> = {};

    for (const f of frames) {
      const t = Number(f.timestampMs);
      for (const raw of f.players) {
        const uid = Number(raw.userId ?? raw.playerId);
        if (!Number.isFinite(uid) || uid <= 0) continue;
        const x = Number(raw.x);
        const y = Number(raw.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!acc[uid]) acc[uid] = { speeds: [], dist: 0, sprints: 0, sprintC: 0, accels: 0 };

        const prev = last.get(uid);
        if (prev) {
          const dx = (x - prev.x) * X_FACTOR;
          const dy = (y - prev.y) * Y_FACTOR;
          const dt = (t - prev.t) / 1000;
          if (dt > 0 && dt < 5) { // ignorar saltos temporales grandes
            const d = Math.sqrt(dx * dx + dy * dy);
            const v = d / dt;
            if (v <= SPEED_CAP) {
              acc[uid].speeds.push(v);
              acc[uid].dist += d;
              if (v >= SPRINT_THR) {
                acc[uid].sprintC++;
                if (acc[uid].sprintC === SPRINT_MIN) acc[uid].sprints++;
              } else {
                acc[uid].sprintC = 0;
              }
              const a = Math.abs(v - prev.v) / dt;
              if (a > ACCEL_THR) acc[uid].accels++;
            }
            last.set(uid, { x, y, t, v });
          }
        } else {
          last.set(uid, { x, y, t, v: 0 });
        }
      }
    }

    const result: Record<number, SpeedMetrics> = {};
    for (const [uid, d] of Object.entries(acc)) {
      const s = d.speeds;
      result[Number(uid)] = {
        avgSpeed: s.length ? +( s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : 0,
        maxSpeed: s.length ? +Math.max(...s).toFixed(2) : 0,
        sprintCount: d.sprints,
        accelerationCount: d.accels,
        distanceM: +d.dist.toFixed(1),
      };
    }
    return result;
  }

  private static _computeZones(frames: Array<{ players: RawPlayer[]; timestampMs: number }>): Record<number, ZoneMetrics> {
    const last = new Map<number, { x: number; y: number; t: number }>();
    const acc: Record<number, ZoneMetrics> = {};

    for (const f of frames) {
      const t = Number(f.timestampMs);
      for (const raw of f.players) {
        const uid = Number(raw.userId ?? raw.playerId);
        if (!Number.isFinite(uid) || uid <= 0) continue;
        const x = Number(raw.x);
        const y = Number(raw.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (!acc[uid]) acc[uid] = { def: 0, mid: 0, att: 0 };

        const prev = last.get(uid);
        if (prev) {
          const dx = (x - prev.x) * X_FACTOR;
          const dy = (y - prev.y) * Y_FACTOR;
          const d = Math.sqrt(dx * dx + dy * dy);
          const zone = prev.x < 33 ? "def" : prev.x < 67 ? "mid" : "att";
          acc[uid][zone] += d;
        }
        last.set(uid, { x, y, t });
      }
    }

    for (const uid of Object.keys(acc)) {
      const z = acc[Number(uid)];
      z.def = +z.def.toFixed(1);
      z.mid = +z.mid.toFixed(1);
      z.att = +z.att.toFixed(1);
    }
    return acc;
  }

  // ── 2.C Heatmaps KDE 2D ──────────────────────────────────────────────────

  private static _computeHeatmaps(frames: Array<{ players: RawPlayer[] }>): Record<number, number[][]> {
    const GRID_W = 21;
    const GRID_H = 14;
    const BW = 5;
    const TWO_SIG_SQ = 2 * BW * BW;

    // Agrupar posiciones por jugador
    const pos: Record<number, Array<[number, number]>> = {};
    for (const f of frames) {
      for (const raw of f.players) {
        const uid = Number(raw.userId ?? raw.playerId);
        if (!Number.isFinite(uid) || uid <= 0) continue;
        const x = Number(raw.x);
        const y = Number(raw.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        (pos[uid] = pos[uid] ?? []).push([x, y]);
      }
    }

    const result: Record<number, number[][]> = {};
    for (const [uid, pts] of Object.entries(pos)) {
      if (pts.length < 3) continue;
      const grid: number[][] = Array.from({ length: GRID_H }, () => new Array(GRID_W).fill(0) as number[]);
      for (let gy = 0; gy < GRID_H; gy++) {
        for (let gx = 0; gx < GRID_W; gx++) {
          const cx = (gx + 0.5) * (100 / GRID_W);
          const cy = (gy + 0.5) * (100 / GRID_H);
          let sum = 0;
          for (const [px, py] of pts) {
            sum += Math.exp(-((cx - px) ** 2 + (cy - py) ** 2) / TWO_SIG_SQ);
          }
          grid[gy][gx] = sum / pts.length;
        }
      }
      // Normalizar 0-1
      let max = 0;
      for (const row of grid) for (const v of row) if (v > max) max = v;
      if (max > 0) {
        for (let gy = 0; gy < GRID_H; gy++)
          for (let gx = 0; gx < GRID_W; gx++)
            grid[gy][gx] = +(grid[gy][gx] / max).toFixed(3);
      }
      result[Number(uid)] = grid;
    }
    return result;
  }

  // ── 2.D Mapa de pases + PageRank ──────────────────────────────────────────

  private static _computePassNetwork(events: MatchEvent[]): PassNetwork {
    const passes = events.filter(
      (e) =>
        ["pass", "key_pass"].includes(e.eventType) &&
        ["complete", "success", null].includes(e.outcome) &&
        e.playerId != null &&
        e.relatedPlayerId != null
    );

    const edgeMap = new Map<string, number>();
    const playerTeam = new Map<number, number>();
    const playerPos = new Map<number, { sx: number; sy: number; n: number }>();

    for (const ev of passes) {
      const from = ev.playerId!;
      const to = ev.relatedPlayerId!;
      edgeMap.set(`${from}->${to}`, (edgeMap.get(`${from}->${to}`) ?? 0) + 1);
      if (ev.teamId) {
        playerTeam.set(from, ev.teamId);
        playerTeam.set(to, ev.teamId);
      }
      // Posición de inicio del pase para layout visual
      if (ev.xStart != null && ev.yStart != null) {
        const cur = playerPos.get(from) ?? { sx: 0, sy: 0, n: 0 };
        cur.sx += ev.xStart; cur.sy += ev.yStart; cur.n++;
        playerPos.set(from, cur);
      }
    }

    const nodeSet = new Set<number>();
    for (const ev of passes) {
      if (ev.playerId) nodeSet.add(ev.playerId);
      if (ev.relatedPlayerId) nodeSet.add(ev.relatedPlayerId);
    }
    const nodeIds = [...nodeSet];
    const N = nodeIds.length;
    if (N === 0) return { nodes: [], edges: [] };

    // PageRank
    const d = 0.85;
    const pr: Record<number, number> = {};
    nodeIds.forEach((n) => (pr[n] = 1 / N));
    const outDeg: Record<number, number> = {};
    for (const [key, cnt] of edgeMap) {
      const from = Number(key.split("->")[0]);
      outDeg[from] = (outDeg[from] ?? 0) + cnt;
    }
    for (let iter = 0; iter < 50; iter++) {
      const next: Record<number, number> = {};
      nodeIds.forEach((n) => (next[n] = (1 - d) / N));
      for (const [key, cnt] of edgeMap) {
        const [f, t] = key.split("->").map(Number);
        if ((outDeg[f] ?? 0) > 0) next[t] += d * pr[f] * (cnt / outDeg[f]);
      }
      Object.assign(pr, next);
    }

    const degree: Record<number, number> = {};
    for (const [key, cnt] of edgeMap) {
      const [f, t] = key.split("->").map(Number);
      degree[f] = (degree[f] ?? 0) + cnt;
      degree[t] = (degree[t] ?? 0) + cnt;
    }

    return {
      nodes: nodeIds.map((id) => {
        const p = playerPos.get(id);
        return {
          playerId: id,
          teamId: playerTeam.get(id) ?? 0,
          degree: degree[id] ?? 0,
          pageRank: +(pr[id] ?? 0).toFixed(4),
          avgX: p ? +(p.sx / p.n).toFixed(1) : 50,
          avgY: p ? +(p.sy / p.n).toFixed(1) : 50,
        };
      }),
      edges: [...edgeMap.entries()].map(([key, cnt]) => {
        const [from, to] = key.split("->").map(Number);
        return { from, to, count: cnt };
      }),
    };
  }

  // ── 2.E Posesión + formación observada ───────────────────────────────────

  private static _computePossession(
    frames: Array<{ players: RawPlayer[]; ballX: number | null; ballY: number | null }>,
    homeTeamId: number,
    awayTeamId: number
  ): { home: number; away: number; homeTeamId: number; awayTeamId: number } {
    const THRESHOLD_M = 3;
    let homeC = 0, awayC = 0;

    for (const f of frames) {
      if (f.ballX == null || f.ballY == null) continue;
      let best: { teamId: number; d: number } | null = null;
      for (const raw of f.players) {
        const tid = Number(raw.teamId);
        if (tid !== homeTeamId && tid !== awayTeamId) continue;
        const dx = (Number(raw.x) - f.ballX) * X_FACTOR;
        const dy = (Number(raw.y) - f.ballY) * Y_FACTOR;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (!best || d < best.d) best = { teamId: tid, d };
      }
      if (best && best.d <= THRESHOLD_M) {
        if (best.teamId === homeTeamId) homeC++;
        else awayC++;
      }
    }

    const total = homeC + awayC || 1;
    return {
      home: +(homeC / total).toFixed(3),
      away: +(awayC / total).toFixed(3),
      homeTeamId,
      awayTeamId,
    };
  }

  private static _computeObservedFormation(
    frames: Array<{ players: RawPlayer[] }>,
    homeTeamId: number,
    awayTeamId: number
  ): { home: string; away: string } {
    const sum = new Map<number, { x: number; y: number; n: number; tid: number }>();
    for (const f of frames) {
      for (const raw of f.players) {
        const uid = Number(raw.userId ?? raw.playerId);
        const tid = Number(raw.teamId);
        if (!Number.isFinite(uid) || uid <= 0) continue;
        if (tid !== homeTeamId && tid !== awayTeamId) continue;
        const cur = sum.get(uid) ?? { x: 0, y: 0, n: 0, tid };
        cur.x += Number(raw.x); cur.y += Number(raw.y); cur.n++;
        sum.set(uid, cur);
      }
    }

    const byTeam: Record<number, Array<{ x: number; y: number }>> = { [homeTeamId]: [], [awayTeamId]: [] };
    for (const [, s] of sum) {
      if (s.n < 10) continue;
      byTeam[s.tid]?.push({ x: s.x / s.n, y: s.y / s.n });
    }

    const detect = (pts: Array<{ x: number; y: number }>): string => {
      if (pts.length < 5) return "?";
      pts.sort((a, b) => a.x - b.x);
      // Excluir portero (el más atrás)
      const field = pts.slice(1);
      const def = field.filter((p) => p.x < 35).length;
      const mid = field.filter((p) => p.x >= 35 && p.x < 65).length;
      const att = field.filter((p) => p.x >= 65).length;
      return `${def}-${mid}-${att}`;
    };

    return {
      home: detect(byTeam[homeTeamId] ?? []),
      away: detect(byTeam[awayTeamId] ?? []),
    };
  }

  // ── 2.F Convex hull + línea defensiva ────────────────────────────────────

  private static _convexHull(pts: Array<[number, number]>): Array<[number, number]> {
    if (pts.length < 3) return pts;
    const sorted = [...pts].sort((a, b) => a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]);
    const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lower: Array<[number, number]> = [];
    for (const p of sorted) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: Array<[number, number]> = [];
    for (let i = sorted.length - 1; i >= 0; i--) {
      const p = sorted[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop(); lower.pop();
    return [...lower, ...upper];
  }

  private static _polyArea(poly: Array<[number, number]>): number {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      s += x1 * y2 - x2 * y1;
    }
    return Math.abs(s) / 2;
  }

  private static _computeConvexHull(
    frames: Array<{ players: RawPlayer[] }>,
    homeTeamId: number,
    awayTeamId: number
  ): { home: number; away: number } {
    let homeTotal = 0, awayTotal = 0, homeN = 0, awayN = 0;

    for (const f of frames) {
      const homePts: Array<[number, number]> = [];
      const awayPts: Array<[number, number]> = [];
      for (const raw of f.players) {
        const tid = Number(raw.teamId);
        const x = Number(raw.x) * X_FACTOR;
        const y = Number(raw.y) * Y_FACTOR;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (tid === homeTeamId) homePts.push([x, y]);
        else if (tid === awayTeamId) awayPts.push([x, y]);
      }
      if (homePts.length >= 3) {
        homeTotal += this._polyArea(this._convexHull(homePts));
        homeN++;
      }
      if (awayPts.length >= 3) {
        awayTotal += this._polyArea(this._convexHull(awayPts));
        awayN++;
      }
    }

    return {
      home: homeN ? +(homeTotal / homeN).toFixed(1) : 0,
      away: awayN ? +(awayTotal / awayN).toFixed(1) : 0,
    };
  }

  private static _computeDefensiveLine(
    frames: Array<{ players: RawPlayer[] }>,
    homeTeamId: number,
    awayTeamId: number
  ): { home: number; away: number } {
    let homeSum = 0, awaySum = 0, homeN = 0, awayN = 0;

    for (const f of frames) {
      const homeXs: number[] = [];
      const awayXs: number[] = [];
      for (const raw of f.players) {
        const tid = Number(raw.teamId);
        const x = Number(raw.x); // 0-100 normalizado
        if (!Number.isFinite(x)) continue;
        if (tid === homeTeamId) homeXs.push(x);
        else if (tid === awayTeamId) awayXs.push(x);
      }
      // Los defensas de cada equipo son los más cercanos a su portería
      // Home: portería en x=0, defensas son los menores x
      if (homeXs.length >= 4) {
        const sorted = homeXs.slice().sort((a, b) => a - b);
        const defLineNorm = sorted.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
        homeSum += defLineNorm * X_FACTOR; // metros desde portería propia
        homeN++;
      }
      // Away: portería en x=100, defensas son los mayores x
      if (awayXs.length >= 4) {
        const sorted = awayXs.slice().sort((a, b) => b - a);
        const defLineNorm = sorted.slice(0, 4).reduce((a, b) => a + b, 0) / 4;
        awaySum += (100 - defLineNorm) * X_FACTOR; // metros desde su portería (invertida)
        awayN++;
      }
    }

    return {
      home: homeN ? +(homeSum / homeN).toFixed(1) : 0,
      away: awayN ? +(awaySum / awayN).toFixed(1) : 0,
    };
  }
}

