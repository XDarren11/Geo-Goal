/**
 * TeamDashboard — Fase 8.D
 *
 * Vista pública con estadísticas agregadas del equipo:
 *   - KPIs: W/D/L, puntos, GF/GC, posesión media, Elo
 *   - Evolución del Elo (line chart de recharts)
 *   - Top scorers / assistants / rated
 *   - Próximos partidos
 *   - Formación más usada
 *
 * Cualquier usuario puede acceder a /teams/:teamId/dashboard
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { getTeamDashboard } from "@/api/publicAPI";
import FavoriteStarButton from "@/components/FavoriteStarButton";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function resultBadgeClass(r: "W" | "D" | "L"): string {
  if (r === "W") return "bg-emerald-500 text-white";
  if (r === "L") return "bg-red-500 text-white";
  return "bg-zinc-500 text-white";
}

// ─── KPI Card ──────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string | null;
  accent?: "emerald" | "amber" | "sky" | "red" | null;
}) {
  const accentClass =
    accent === "emerald" ? "text-emerald-300" :
    accent === "amber" ? "text-amber-300" :
    accent === "sky" ? "text-sky-300" :
    accent === "red" ? "text-red-300" :
    "text-[var(--geo-text)]";

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
      <div className="text-xs uppercase tracking-wider text-[var(--geo-text-muted)]">{label}</div>
      <div className={`text-2xl font-black mt-1 ${accentClass}`}>{value}</div>
      {hint ? <div className="text-[10px] text-[var(--geo-text-muted)] mt-1">{hint}</div> : null}
    </div>
  );
}

// ─── Forma reciente badges ─────────────────────────────────────────────────

function FormBadges({ streak }: { streak: string }) {
  if (!streak) return null;
  return (
    <div className="flex gap-1">
      {streak.split("").map((r, i) => (
        <span
          key={i}
          className={`inline-flex items-center justify-center w-7 h-7 rounded text-xs font-black ${resultBadgeClass(r as "W" | "D" | "L")}`}
        >
          {r}
        </span>
      ))}
    </div>
  );
}

// ─── Top jugadores tabla ───────────────────────────────────────────────────

function TopPlayersTable({
  title,
  rows,
  valueLabel,
  valueKey,
}: {
  title: string;
  rows: Array<{ playerId: number; name: string; [k: string]: any }>;
  valueLabel: string;
  valueKey: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
      <h3 className="text-sm font-bold text-[var(--geo-text)] mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--geo-text-muted)]">Sin datos.</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((p, idx) => (
            <li
              key={p.playerId}
              className="flex items-center justify-between gap-2 text-sm py-1.5 border-b border-[var(--geo-border)]/20 last:border-0"
            >
              <span className="flex items-center gap-2">
                <span className="w-5 text-xs text-[var(--geo-text-muted)] text-right">{idx + 1}.</span>
                <Link
                  to={`/players/${p.playerId}/dashboard`}
                  className="hover:text-emerald-400 truncate max-w-[180px]"
                >
                  {p.name}
                </Link>
              </span>
              <span className="font-bold text-[var(--geo-text)]">
                {Number(p[valueKey]).toFixed(valueKey === "avgRating" ? 2 : 0)}
                {valueLabel ? <span className="text-xs text-[var(--geo-text-muted)] ml-1">{valueLabel}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────

export default function TeamDashboard() {
  const { teamId } = useParams<{ teamId: string }>();
  const id = Number(teamId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["team-dashboard", id],
    queryFn: () => getTeamDashboard(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });

  if (!Number.isInteger(id) || id <= 0) {
    return <div className="p-6 text-red-400">ID de equipo no válido</div>;
  }
  if (isLoading) {
    return <div className="p-6 text-[var(--geo-text-muted)]">Cargando dashboard del equipo...</div>;
  }
  if (isError || !data) {
    return <div className="p-6 text-red-400">Error al cargar el dashboard del equipo</div>;
  }

  const eloChartData = data.eloHistory.map((h, i) => ({
    idx: i + 1,
    after: h.after,
    date: formatDate(h.date),
  }));

  const formationEntries = Object.entries(data.formationDistribution).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        {data.team.logoUrl ? (
          <img src={data.team.logoUrl} alt={data.team.name} className="w-16 h-16 rounded object-contain bg-white/5" />
        ) : (
          <div className="w-16 h-16 rounded bg-emerald-500/20 flex items-center justify-center text-2xl">
            ⚽
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black text-[var(--geo-text)]">{data.team.name}</h1>
          <p className="text-sm text-[var(--geo-text-muted)]">
            {data.matchesPlayed} partidos · {data.points} puntos · {data.pointsPerMatch.toFixed(2)} PPP
          </p>
        </div>
        <FavoriteStarButton
          entityType="team"
          entityId={id}
          label={data.team.name}
          size="md"
        />
        <FormBadges streak={data.formStreak} />
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Victorias"
          value={data.wins}
          hint={`${data.draws} E · ${data.losses} D`}
          accent="emerald"
        />
        <KpiCard
          label="Goles a favor"
          value={data.goalsFor}
          hint={`Diferencia: ${data.goalDiff >= 0 ? "+" : ""}${data.goalDiff}`}
          accent={data.goalDiff >= 0 ? "emerald" : "red"}
        />
        <KpiCard
          label="Goles en contra"
          value={data.goalsAgainst}
          hint={data.matchesPlayed > 0 ? `${(data.goalsAgainst / data.matchesPlayed).toFixed(2)}/partido` : null}
        />
        <KpiCard
          label="Elo rating"
          value={data.eloRating}
          hint={data.eloHistory.length > 0 ? `${data.eloHistory.length} cambios` : null}
          accent={data.eloRating >= 1600 ? "emerald" : data.eloRating < 1400 ? "red" : "amber"}
        />
        <KpiCard
          label="Posesión media"
          value={`${(data.avgPossession * 100).toFixed(0)}%`}
          hint={data.avgPossession > 0.55 ? "Dominante" : data.avgPossession < 0.45 ? "Reactivo" : "Equilibrado"}
          accent={data.avgPossession > 0.55 ? "emerald" : null}
        />
        <KpiCard
          label="Tiros/partido"
          value={data.avgShotsPerMatch.toFixed(1)}
          hint={`${(data.avgPassAccuracy * 100).toFixed(0)}% pase OK`}
        />
        <KpiCard
          label="Convex hull"
          value={`${data.avgConvexHull} m²`}
          hint={data.avgConvexHull > 2000 ? "Extendido" : data.avgConvexHull < 1500 ? "Compacto" : "Estándar"}
        />
        <KpiCard
          label="Línea defensiva"
          value={`${data.avgDefensiveLine} m`}
          hint={data.avgDefensiveLine > 40 ? "Bloque alto" : data.avgDefensiveLine < 25 ? "Bloque bajo" : "Bloque medio"}
        />
      </div>

      {/* Formación + Elo en línea */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Formación más usada */}
        <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <h3 className="text-sm font-bold text-[var(--geo-text)] mb-2">📐 Formación favorita</h3>
          <div className="text-4xl font-black text-emerald-400">{data.mostUsedFormation}</div>
          {formationEntries.length > 1 && (
            <div className="mt-3 text-[11px] text-[var(--geo-text-muted)] space-y-1">
              {formationEntries.slice(0, 4).map(([f, n]) => (
                <div key={f} className="flex justify-between">
                  <span>{f}</span>
                  <span>{n}×</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Elo evolution */}
        <div className="md:col-span-2 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <h3 className="text-sm font-bold text-[var(--geo-text)] mb-3">Evolución Elo (últimos {eloChartData.length})</h3>
          {eloChartData.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={eloChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="idx" tick={{ fontSize: 10, fill: "#888" }} />
                <YAxis
                  domain={["dataMin - 30", "dataMax + 30"]}
                  tick={{ fontSize: 10, fill: "#888" }}
                />
                <Tooltip
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", fontSize: 12 }}
                  formatter={(value) => {
                    const numeric = typeof value === "number" ? value : Number(value);
                    return [`${Number.isFinite(numeric) ? Math.round(numeric) : "—"}`, "Elo"];
                  }}
                  labelFormatter={(label) => {
                    const idx = typeof label === "number" ? label : Number(label);
                    if (!Number.isFinite(idx)) return "Partido";
                    return `Partido #${idx} · ${eloChartData[idx - 1]?.date ?? ""}`;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="after"
                  stroke="#34d399"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#34d399" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-[var(--geo-text-muted)]">
              Necesita al menos 2 partidos para ver la tendencia.
            </p>
          )}
        </div>
      </div>

      {/* Top jugadores */}
      <div className="grid md:grid-cols-3 gap-4">
        <TopPlayersTable
          title="🥇 Top scorers"
          rows={data.topScorers}
          valueKey="goals"
          valueLabel="goles"
        />
        <TopPlayersTable
          title="🅰️ Top asistentes"
          rows={data.topAssistants}
          valueKey="assists"
          valueLabel="asists."
        />
        <TopPlayersTable
          title="⭐ Mejor rating promedio"
          rows={data.topRated}
          valueKey="avgRating"
          valueLabel=""
        />
      </div>

      {/* Forma reciente */}
      <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">📈 Forma reciente</h2>
        {data.recentForm.length === 0 ? (
          <p className="text-xs text-[var(--geo-text-muted)]">Sin partidos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[400px]">
              <thead className="text-left text-[11px] text-[var(--geo-text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th>Rival</th>
                  <th className="text-center">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {data.recentForm.map((m) => (
                  <tr key={m.matchId} className="border-t border-[var(--geo-border)]/30">
                    <td className="py-2 text-xs text-[var(--geo-text-muted)]">{formatDate(m.date)}</td>
                    <td>
                      <Link to={`/public/matches/${m.matchId}/detail`} className="hover:text-emerald-400">
                        {m.opponent}
                      </Link>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex w-20 justify-center px-2 py-0.5 rounded text-[10px] font-bold ${resultBadgeClass(m.result)}`}>
                        {m.result} {m.scoreFor}-{m.scoreAgainst}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Próximos partidos */}
      {data.upcomingMatches.length > 0 && (
        <section className="rounded-xl border border-sky-500/30 bg-sky-500/5 p-4">
          <h2 className="text-sm font-bold text-sky-300 mb-3">🗓️ Próximos partidos</h2>
          <ul className="space-y-2">
            {data.upcomingMatches.map((m) => (
              <li
                key={m.matchId}
                className="flex items-center justify-between border-b border-sky-500/20 pb-2 last:border-0"
              >
                <Link to={`/public/matches/${m.matchId}/detail`} className="text-sm hover:text-sky-300">
                  vs {m.opponent} {m.isHome ? "(local)" : "(visitante)"}
                </Link>
                <span className="text-xs text-[var(--geo-text-muted)]">{formatDate(m.date)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
