/**
 * TeamFormBadges — Fase 6.B
 * Muestra la forma reciente de un equipo (WWDLD streak).
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface TeamFormResponse {
  summary: { pointsPerMatch: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; streak: string };
  recent: Array<{ matchId: number; date: string | null; scoreFor: number; scoreAgainst: number; result: "W" | "D" | "L" }>;
}

const RESULT_STYLE: Record<string, string> = {
  W: "bg-emerald-500",
  D: "bg-zinc-500",
  L: "bg-red-500",
};

interface Props {
  teamId: number;
  teamName?: string;
  last?: number;
  /** Si true, muestra versión compacta sólo con badges */
  compact?: boolean;
}

export function TeamFormBadges({ teamId, teamName, last = 5, compact = false }: Props) {
  const { data, isLoading } = useQuery<TeamFormResponse>({
    queryKey: ["team-form", teamId, last],
    queryFn: async () => {
      const { data } = await api.get<TeamFormResponse>(`/public/teams/${teamId}/form`, { params: { last } });
      return data;
    },
    staleTime: 5 * 60_000,
    retry: 1,
  });

  if (isLoading) return <span className="text-[10px] text-[var(--geo-text-muted)]">···</span>;
  if (!data) return null;

  const { summary: s } = data;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {s.streak.split("").map((r, i) => (
          <span
            key={i}
            className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-black text-white ${RESULT_STYLE[r] ?? "bg-zinc-600"}`}
          >
            {r}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teamName && <p className="text-xs font-bold text-[var(--geo-text-muted)]">{teamName}</p>}

      {/* Badges streak */}
      <div className="flex items-center gap-1.5">
        {s.streak.split("").map((r, i) => (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded text-xs font-black text-white ${RESULT_STYLE[r] ?? "bg-zinc-600"}`}
          >
            {r}
          </span>
        ))}
        {!s.streak && <span className="text-xs text-[var(--geo-text-muted)]">Sin partidos</span>}
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <p className="font-black text-emerald-400">{s.wins}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">V</p>
        </div>
        <div>
          <p className="font-black text-zinc-400">{s.draws}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">E</p>
        </div>
        <div>
          <p className="font-black text-red-400">{s.losses}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">D</p>
        </div>
        <div>
          <p className="font-black text-geo-green">{s.pointsPerMatch.toFixed(1)}</p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">pts/p</p>
        </div>
      </div>

      <p className="text-[10px] text-[var(--geo-text-muted)]">
        GF {s.goalsFor} · GC {s.goalsAgainst}
      </p>
    </div>
  );
}

