/**
 * MatchPrediction — Fase 3
 * Tarjeta de predicción Elo + Dixon-Coles para un partido.
 * Se muestra tanto antes (partido pendiente) como después del partido.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface EloPrediction {
  home: { winProb: number; elo: number };
  draw: { prob: number };
  away: { winProb: number; elo: number };
}

interface DixonColesPrediction {
  expectedGoals: { home: number; away: number };
  outcomes: { homeWin: number; draw: number; awayWin: number };
  topScores: Array<{ score: string; prob: number }>;
}

interface MatchPredictionResponse {
  elo: EloPrediction | null;
  poisson: DixonColesPrediction | null;
}

async function fetchMatchPrediction(matchId: number): Promise<MatchPredictionResponse> {
  const { data } = await api.get<MatchPredictionResponse>(
    `/public/matches/${matchId}/prediction`
  );
  return data;
}

interface Props {
  matchId: number;
  homeName: string;
  awayName: string;
}

export function MatchPrediction({ matchId, homeName, awayName }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["match-prediction", matchId],
    queryFn: () => fetchMatchPrediction(matchId),
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 text-xs text-[var(--geo-text-muted)]">
        <div className="h-4 w-4 animate-spin rounded-full border border-geo-green border-t-transparent" />
        Calculando predicción...
      </div>
    );
  }

  if (isError || (!data?.elo && !data?.poisson)) {
    return (
      <p className="py-2 text-xs text-[var(--geo-text-muted)]">
        Sin datos de predicción disponibles aún.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-geo-green/20 bg-geo-green/5 p-4 space-y-4">
      <h3 className="font-bold text-geo-green text-sm tracking-wide">Predicción del partido</h3>

      {data.elo && <EloBlock elo={data.elo} homeName={homeName} awayName={awayName} />}

      {data.poisson && <PoissonBlock poisson={data.poisson} homeName={homeName} awayName={awayName} />}
    </div>
  );
}

// ── Bloque Elo ───────────────────────────────────────────────────────────────

function EloBlock({ elo, homeName, awayName }: { elo: EloPrediction; homeName: string; awayName: string }) {
  return (
    <div className="space-y-2">
      <ProbBar
        label={homeName}
        subLabel={`Elo ${elo.home.elo}`}
        value={elo.home.winProb}
        color="bg-blue-500"
      />
      <ProbBar
        label="Empate"
        value={elo.draw.prob}
        color="bg-zinc-500"
      />
      <ProbBar
        label={awayName}
        subLabel={`Elo ${elo.away.elo}`}
        value={elo.away.winProb}
        color="bg-orange-500"
      />
    </div>
  );
}

// ── Bloque Dixon-Coles ───────────────────────────────────────────────────────

function PoissonBlock({
  poisson,
  homeName,
  awayName,
}: {
  poisson: DixonColesPrediction;
  homeName: string;
  awayName: string;
}) {
  return (
    <div className="border-t border-geo-green/15 pt-3 space-y-2">
      <div className="flex gap-4 text-xs">
        <div className="text-center flex-1">
          <p className="text-[var(--geo-text-muted)]">Goles esperados</p>
          <p className="text-lg font-black text-blue-400">{poisson.expectedGoals.home}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">{homeName}</p>
        </div>
        <div className="text-center flex-1">
          <p className="text-[var(--geo-text-muted)]">Goles esperados</p>
          <p className="text-lg font-black text-orange-400">{poisson.expectedGoals.away}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">{awayName}</p>
        </div>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--geo-text-muted)] mb-1">
          Marcadores más probables
        </p>
        <div className="space-y-1">
          {poisson.topScores.slice(0, 5).map((s: { score: string; prob: number }) => (
            <div key={s.score} className="flex items-center gap-2">
              <span className="w-12 rounded bg-white/10 px-2 py-0.5 text-center text-xs font-bold text-[var(--geo-text)]">
                {s.score}
              </span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-geo-green/70 rounded-full"
                  style={{ width: `${Math.min(100, s.prob * 600)}%` }}
                />
              </div>
              <span className="w-10 text-right text-[10px] text-[var(--geo-text-muted)]">
                {(s.prob * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── ProbBar ──────────────────────────────────────────────────────────────────

function ProbBar({
  label,
  subLabel,
  value,
  color,
}: {
  label: string;
  subLabel?: string;
  value: number;
  color: string;
}) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-28 text-right">
        <span className="font-semibold text-[var(--geo-text)] truncate block">{label}</span>
        {subLabel && <span className="text-[10px] text-[var(--geo-text-muted)]">{subLabel}</span>}
      </div>
      <div className="flex-1 h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-9 text-right font-bold text-[var(--geo-text)]">{pct}%</span>
    </div>
  );
}




