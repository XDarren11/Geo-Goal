/**
 * Contratos de payload HTTP para detalle de partido y telemetría de árbitro.
 * Alineados con RefereeService / MatchDetailService (validación exhaustiva sigue en servicio).
 */

export type AssignRefereeBodyDTO = {
  refereeUserId: number;
  status?: "assigned" | "checked_in" | "closed";
};

export type RegisterMatchEventBodyDTO = {
  eventType: string;
  minute: number;
  extraMinute?: number | null;
  matchTimestampSec?: number | null;
  teamId?: number | null;
  playerId?: number | null;
  relatedPlayerId?: number | null;
  xStart?: number | null;
  yStart?: number | null;
  xEnd?: number | null;
  yEnd?: number | null;
  outcome?: string | null;
  source?: "manual" | "inferred" | "video" | "simulated";
  confidence?: number;
  metadata?: Record<string, unknown>;
};

export type RegisterBulkEventsBodyDTO = {
  events: RegisterMatchEventBodyDTO[];
};

export type RegisterTrackingFrameBodyDTO = {
  timestampMs: number;
  period?: "pre" | "1H" | "HT" | "2H" | "ET" | "post" | null;
  ball?: { x?: number; y?: number; z?: number };
  players: Array<Record<string, unknown>>;
  source?: "manual" | "inferred" | "video" | "simulated";
  confidence?: number;
  coordSystem?: "normalized" | "meters";
};

export type RegisterTrackingBatchBodyDTO = {
  frames: RegisterTrackingFrameBodyDTO[];
  pitch?: { length_m: number; width_m: number };
};

/**
 * Upsert de detalle de partido: muchos campos opcionales; el servicio valida.
 */
export type MatchDetailUpsertBodyDTO = Record<string, unknown>;

export type AutoAssignRefereesResultDTO = {
  assigned: number;
  skipped: number;
  message: string;
  details: Array<{
    matchId: number;
    roundName: string;
    refereeUserId: number | null;
    refereeName: string;
    status: string;
  }>;
};
