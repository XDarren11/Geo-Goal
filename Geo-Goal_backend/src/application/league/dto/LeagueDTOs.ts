export type CreateLeagueDTO = {
  name: string;
  description: string;
};

export type UpdateLeagueDTO = {
  name: string;
  description: string;
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
