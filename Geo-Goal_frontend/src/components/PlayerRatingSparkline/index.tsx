/**
 * PlayerRatingSparkline — Fase 4.C
 * Mini sparkline de los últimos N ratings del jugador.
 * Renderiza como SVG inline (sin dependencias externas).
 */

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";

interface FormEntry {
  matchId: number;
  rating: number;
  date: string | null;
}

interface Props {
  userId: number;
  last?: number;
  width?: number;
  height?: number;
}

export function PlayerRatingSparkline({ userId, last = 5, width = 80, height = 24 }: Props) {
  const { data = [] } = useQuery<FormEntry[]>({
    queryKey: ["player-form", userId, last],
    queryFn: async () => {
      const { data } = await api.get(`/public/players/${userId}/form`, { params: { last } });
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60_000,
    enabled: !!userId,
  });

  if (data.length < 2) return null;

  const ratings = data.map((d) => d.rating);
  const min = Math.min(...ratings, 0);
  const max = Math.max(...ratings, 10);
  const range = max - min || 1;

  const pad = 2;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;

  const pts = ratings.map((r, i) => {
    const x = pad + (i / (ratings.length - 1)) * innerW;
    const y = pad + (1 - (r - min) / range) * innerH;
    return `${x},${y}`;
  });

  const lastRating = ratings[ratings.length - 1];
  const color = lastRating >= 8 ? "#22c55e" : lastRating >= 6.5 ? "#39FF14" : lastRating >= 5 ? "#eab308" : "#ef4444";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
      aria-label={`Últimos ${ratings.length} partidos`}
    >
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Punto del último valor */}
      {(() => {
        const [lx, ly] = pts[pts.length - 1].split(",").map(Number);
        return <circle cx={lx} cy={ly} r={2.5} fill={color} />;
      })()}
    </svg>
  );
}


