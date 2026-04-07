import api from '@/lib/axios';

export type RefereeAssignment = {
  id: number;
  matchId: number;
  leagueId: number;
  refereeUserId: number;
  status: 'assigned' | 'checked_in' | 'closed';
  match?: {
    id: number;
    date?: string | null;
    roundName?: string;
    homeTeam?: { id: number; name: string; logoUrl?: string | null };
    awayTeam?: { id: number; name: string; logoUrl?: string | null };
    homeTeamId?: number;
    awayTeamId?: number;
  };
};

export async function getRefereeTodayMatches(): Promise<RefereeAssignment[]> {
  const { data } = await api.get<RefereeAssignment[]>('/league/referee/matches/today');
  return Array.isArray(data) ? data : [];
}

export async function getRefereeDashboardSummary(): Promise<any> {
  const { data } = await api.get('/league/referee/dashboard');
  return data;
}

export async function registerMatchEvent(
  matchId: number,
  body: {
    eventType:
      | 'goal'
      | 'own_goal'
      | 'penalty_scored'
      | 'penalty_missed'
      | 'yellow_card'
      | 'red_card'
      | 'substitution'
      | 'foul'
      | 'offside'
      | 'var_review';
    minute: number;
    extraMinute?: number | null;
    teamId?: number | null;
    playerId?: number | null;
    metadata?: Record<string, unknown>;
  }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/events`, body);
  return data;
}

export async function registerTrackingFrame(
  matchId: number,
  body: {
    timestampMs: number;
    period?: 'pre' | '1H' | 'HT' | '2H' | 'ET' | 'post' | null;
    ball?: { x?: number; y?: number; z?: number };
    players: Array<Record<string, unknown>>;
  }
) {
  const { data } = await api.post(`/league/matches/${matchId}/referee/tracking`, body);
  return data;
}
