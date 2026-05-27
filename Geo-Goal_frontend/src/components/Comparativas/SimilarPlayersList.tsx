/**
 * SimilarPlayersList — Fase 6.D
 * Lista de jugadores con perfil estadístico similar (cosine similarity).
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api from "@/lib/axios";

interface SimilarPlayer { playerId: number; name: string; similarity: number }

interface Props {
  playerId: number;
  n?: number;
}

export function SimilarPlayersList({ playerId, n = 5 }: Props) {
  const { data, isLoading, isError } = useQuery<SimilarPlayer[]>({
    queryKey: ["similar-players", playerId, n],
    queryFn: async () => {
      const { data } = await api.get<SimilarPlayer[]>(`/public/players/${playerId}/similar`, { params: { n } });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 15 * 60_000,
    retry: 1,
  });

  if (isLoading) return <p className="text-xs text-[var(--geo-text-muted)]">Buscando jugadores similares...</p>;
  if (isError) return <p className="text-xs text-red-400">No disponible.</p>;
  if (!data?.length) return <p className="text-xs text-[var(--geo-text-muted)]">Sin datos suficientes para comparar.</p>;

  return (
    <div className="space-y-1">
      {data.map((p) => {
        const pct = Math.round(p.similarity * 100);
        return (
          <Link
            key={p.playerId}
            to={`/public/players/${p.playerId}`}
            className="flex items-center justify-between rounded-lg px-3 py-2 transition hover:bg-white/5"
          >
            <span className="text-sm font-semibold text-[var(--geo-text)]">{p.name}</span>
            <div className="flex items-center gap-2">
              {/* Mini barra */}
              <div className="h-1.5 w-16 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-geo-green/70" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-bold text-geo-green">{pct}%</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

