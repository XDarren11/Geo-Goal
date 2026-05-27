/**
 * PlayerCompareRadar — Fase 6.C
 * Radar comparativo de dos jugadores usando recharts.
 */

import { useQuery } from "@tanstack/react-query";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import api from "@/lib/axios";

interface PlayerRadarData { goals: number; assists: number; passing: number; distance: number; rating: number; shots: number }
interface CompareResponse { playerA: PlayerRadarData; playerB: PlayerRadarData }

const DIMS: Array<{ key: keyof PlayerRadarData; label: string }> = [
  { key: "goals", label: "Goles" },
  { key: "assists", label: "Asistencias" },
  { key: "passing", label: "Pases" },
  { key: "distance", label: "Distancia" },
  { key: "rating", label: "Rating" },
  { key: "shots", label: "Tiros" },
];

interface Props {
  id1: number;
  id2: number;
  name1: string;
  name2: string;
}

export function PlayerCompareRadar({ id1, id2, name1, name2 }: Props) {
  const { data, isLoading, isError } = useQuery<CompareResponse>({
    queryKey: ["compare-players", id1, id2],
    queryFn: async () => {
      const { data } = await api.get<CompareResponse>(`/public/players/${id1}/compare/${id2}`);
      return data;
    },
    staleTime: 10 * 60_000,
    retry: 1,
  });

  if (isLoading) return <p className="text-xs text-[var(--geo-text-muted)] py-4 text-center">Cargando comparativa...</p>;
  if (isError || !data) return <p className="text-xs text-red-400 py-4 text-center">Sin datos de comparativa.</p>;

  const chartData = DIMS.map(({ key, label }) => ({
    dimension: label,
    [name1]: data.playerA[key],
    [name2]: data.playerB[key],
  }));

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--geo-text-muted)", fontSize: 11 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }} />
          <Radar name={name1} dataKey={name1} stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
          <Radar name={name2} dataKey={name2} stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
            formatter={(value: unknown) => [`${value}`, ""] as [string, string]}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Tabla comparativa */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--geo-border)]">
              <th className="py-1 text-left text-[var(--geo-text-muted)]">Dimensión</th>
              <th className="py-1 text-right text-emerald-400">{name1}</th>
              <th className="py-1 text-right text-blue-400">{name2}</th>
            </tr>
          </thead>
          <tbody>
            {DIMS.map(({ key, label }) => (
              <tr key={key} className="border-b border-white/5">
                <td className="py-1 text-[var(--geo-text-muted)]">{label}</td>
                <td className={`py-1 text-right font-bold ${data.playerA[key] > data.playerB[key] ? "text-emerald-400" : "text-[var(--geo-text)]"}`}>
                  {data.playerA[key]}
                </td>
                <td className={`py-1 text-right font-bold ${data.playerB[key] > data.playerA[key] ? "text-blue-400" : "text-[var(--geo-text)]"}`}>
                  {data.playerB[key]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


