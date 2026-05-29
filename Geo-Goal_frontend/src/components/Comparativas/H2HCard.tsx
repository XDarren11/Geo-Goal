/**
 * H2HCard — Fase 6.A
 * Historial cabeza a cabeza entre dos equipos.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface H2HResponse {
  summary: { played: number; teamAWins: number; teamBWins: number; draws: number; avgGoalsPerMatch: number; goalsFor: { teamA: number; teamB: number } };
  recent: Array<{ matchId: number; date: string | null; homeTeam: string; awayTeam: string; score: string; winner: string }>;
}

interface Props {
  teamAId: number;
  teamBId: number;
  teamAName: string;
  teamBName: string;
}

export function H2HCard({ teamAId, teamBId, teamAName, teamBName }: Props) {
  const { data, isLoading, isError } = useQuery<H2HResponse>({
    queryKey: ["h2h", teamAId, teamBId],
    queryFn: async () => {
      const { data } = await api.get<H2HResponse>(`/public/teams/${teamAId}/h2h/${teamBId}`);
      return data;
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (isLoading) return <p className="text-xs text-[var(--geo-text-muted)] py-2">Cargando historial...</p>;
  if (isError || !data) return <p className="text-xs text-red-400 py-2">Sin historial disponible.</p>;

  const { summary: s, recent } = data;

  return (
    <div className="space-y-4">
      {/* Resumen */}
      {s.played > 0 ? (
        <>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-blue-400">{s.teamAWins}</p>
              <p className="text-[10px] text-[var(--geo-text-muted)] truncate">{teamAName}</p>
            </div>
            <div>
              <p className="text-2xl font-black text-zinc-400">{s.draws}</p>
              <p className="text-[10px] text-[var(--geo-text-muted)]">Empates</p>
            </div>
            <div>
              <p className="text-2xl font-black text-orange-400">{s.teamBWins}</p>
              <p className="text-[10px] text-[var(--geo-text-muted)] truncate">{teamBName}</p>
            </div>
          </div>

          {/* Barra proporcional */}
          <div className="flex h-2.5 overflow-hidden rounded-full">
            <div className="bg-blue-500" style={{ width: `${(s.teamAWins / s.played) * 100}%` }} />
            <div className="bg-zinc-500" style={{ width: `${(s.draws / s.played) * 100}%` }} />
            <div className="bg-orange-500" style={{ width: `${(s.teamBWins / s.played) * 100}%` }} />
          </div>

          <p className="text-[10px] text-center text-[var(--geo-text-muted)]">
            {s.played} partidos · Promedio {s.avgGoalsPerMatch} goles/partido
          </p>

          {/* Últimos encuentros */}
          {recent.length > 0 && (
            <ul className="space-y-1">
              {recent.slice(0, 5).map((m) => (
                <li key={m.matchId} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5 text-xs">
                  <span className="text-[var(--geo-text-muted)]">{m.date ? new Date(m.date).toLocaleDateString("es-MX") : "—"}</span>
                  <span className="font-bold text-[var(--geo-text)]">
                    {m.homeTeam} <span className="text-geo-green font-mono">{m.score}</span> {m.awayTeam}
                  </span>
                  <span className={`text-[10px] font-bold ${m.winner === "Empate" ? "text-zinc-400" : m.winner === teamAName ? "text-blue-400" : "text-orange-400"}`}>
                    {m.winner === "Empate" ? "E" : m.winner === teamAName ? "A" : "B"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="py-4 text-center text-xs text-[var(--geo-text-muted)]">
          Estos equipos nunca se han enfrentado en esta plataforma.
        </p>
      )}
    </div>
  );
}

