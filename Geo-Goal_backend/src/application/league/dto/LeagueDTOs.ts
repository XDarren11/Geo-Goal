export type CreateLeagueDTO = {
  name: string;
  description: string;
  lineupMode: 7 | 11;
  logoFile?: import("../../../utils/supabaseStorage").UploadedImageFile | null;
};

export type UpdateLeagueDTO = {
  name: string;
  description: string;
  lineupMode?: 7 | 11;
};

export type GenerateFixtureOptionsDTO = {
  scheduleStartDate?: string;
  matchTime?: string;
  daysBetweenRounds?: number;
  matchDuration?: number;
};

/** Contexto para auditoría al reestructurar el fixture (HTTP → aplicación). */
export type RestructureFixtureAuditDTO = {
  actorUserId: number | null;
  reason?: string;
  ip?: string | null;
  userAgent?: string | null;
};
