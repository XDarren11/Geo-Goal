/**
 * WeeklyAwardCard — Fase 4.D
 * Tarjeta "🌟 Jugador de la Jornada" para LeagueDetail.
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import { PlayerRatingSparkline } from "@/components/PlayerRatingSparkline";

interface WeeklyAwardData {
  leagueId: number;
  weekStart: string;
  weekEnd: string;
  avgRating: number;
  matchesInWeek: number;
  player: { id: number; name: string; avatarUrl?: string | null };
  team: { id: number; name: string; logoUrl?: string | null };
}

interface Props {
  leagueId: number;
}

export function WeeklyAwardCard({ leagueId }: Props) {
  const { data, isLoading } = useQuery<WeeklyAwardData>({
    queryKey: ["weekly-award", leagueId],
    queryFn: async () => {
      const { data } = await api.get(`/public/leagues/${leagueId}/weekly-award`);
      return data;
    },
    staleTime: 60 * 60_000,
    retry: false,
  });

  if (isLoading) return null;
  if (!data) return null;

  const weekStr = (() => {
    const s = new Date(data.weekStart).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
    const e = new Date(data.weekEnd).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
    return `${s} – ${e}`;
  })();

  return (
    <div className="rounded-2xl border-2 border-yellow-500/40 bg-yellow-500/[0.07] p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">🌟</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">
            Jugador de la Jornada
          </p>
          <p className="text-[10px] text-[var(--geo-text-muted)]">{weekStr}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {/* Avatar */}
        {data.player.avatarUrl ? (
          <img
            src={data.player.avatarUrl}
            alt={data.player.name}
            className="h-12 w-12 rounded-full border-2 border-yellow-500/50 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-yellow-500/50 bg-yellow-500/10 text-xl font-black text-yellow-400">
            {data.player.name[0]}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="truncate font-black text-[var(--geo-text)]">{data.player.name}</p>
          <p className="text-xs text-[var(--geo-text-muted)]">{data.team.name}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded bg-yellow-500/20 px-2 py-0.5 text-xs font-black text-yellow-300">
              ⭐ {data.avgRating.toFixed(2)}
            </span>
            <span className="text-[10px] text-[var(--geo-text-muted)]">
              {data.matchesInWeek} partido{data.matchesInWeek !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Sparkline de forma reciente */}
        <div className="shrink-0">
          <PlayerRatingSparkline userId={data.player.id} last={5} width={72} height={28} />
        </div>
      </div>
    </div>
  );
}

