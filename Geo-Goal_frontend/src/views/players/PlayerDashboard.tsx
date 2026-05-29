/**
 * PlayerDashboard — Fase 8.C
 *
 * Vista pública con TODAS las estadísticas agregadas del jugador a lo largo
 * de su carrera. Reutiliza:
 *   - PlayerHeatmap (Fase 2.C) → heatmap acumulado de TODOS sus partidos
 *   - PlayerRatingSparkline (Fase 4) → evolución del rating
 *
 * Cualquier usuario logueado o público puede acceder a /players/:playerId/dashboard
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPlayerDashboard, getPlayerHeatmap, type PlayerCareerStats } from "@/api/publicAPI";
import { PlayerHeatmap } from "@/components/Heatmap/PlayerHeatmap";
import FavoriteStarButton from "@/components/FavoriteStarButton";

// ─── Helpers de presentación ───────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

function ratingColor(r: number): string {
  if (r >= 8) return "text-emerald-300";
  if (r >= 7) return "text-emerald-400";
  if (r >= 6) return "text-amber-400";
  if (r >= 4) return "text-orange-400";
  return "text-red-400";
}

function resultColor(r: "W" | "D" | "L" | "—"): string {
  if (r === "W") return "bg-emerald-500/20 text-emerald-300";
  if (r === "L") return "bg-red-500/20 text-red-300";
  if (r === "D") return "bg-zinc-500/20 text-zinc-300";
  return "bg-zinc-700/20 text-zinc-500";
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

// ─── Sparkline ligero inline ──────────────────────────────────────────────

function MiniRatingSparkline({
  ratings,
  width = 180,
  height = 40,
}: {
  ratings: number[];
  width?: number;
  height?: number;
}) {
  if (!ratings.length) return null;
  const min = Math.max(0, Math.min(...ratings) - 0.5);
  const max = Math.min(10, Math.max(...ratings) + 0.5);
  const span = Math.max(0.5, max - min);
  const points = ratings.map((r, i) => {
    const x = (i / Math.max(1, ratings.length - 1)) * width;
    const y = height - ((r - min) / span) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} className="block">
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="#34d399"
        strokeWidth={2}
      />
      {ratings.map((r, i) => {
        const x = (i / Math.max(1, ratings.length - 1)) * width;
        const y = height - ((r - min) / span) * height;
        return <circle key={i} cx={x} cy={y} r={2.5} fill="#34d399" />;
      })}
    </svg>
  );
}

// ─── Distribución de eventos (barras simples) ──────────────────────────────

function EventDistribution({ data }: { data: PlayerCareerStats }) {
  const items = [
    { label: "Goles", value: data.goals, color: "bg-emerald-500" },
    { label: "Asistencias", value: data.assists, color: "bg-sky-500" },
    { label: "Tiros", value: data.shots, color: "bg-violet-500" },
    { label: "Pases clave", value: data.keyPasses, color: "bg-amber-500" },
    { label: "Amarillas", value: data.yellowCards, color: "bg-yellow-500" },
    { label: "Rojas", value: data.redCards, color: "bg-red-500" },
    { label: "Faltas", value: data.fouls, color: "bg-orange-500" },
  ];
  const max = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-2">
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-3 text-xs">
          <span className="w-20 text-[var(--geo-text-muted)]">{it.label}</span>
          <div className="flex-1 h-3 rounded bg-[var(--geo-bg)] overflow-hidden">
            <div
              className={`h-full ${it.color} transition-all`}
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>
          <span className="w-8 text-right font-bold text-[var(--geo-text)]">{it.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────

export default function PlayerDashboard() {
  const { playerId } = useParams<{ playerId: string }>();
  const id = Number(playerId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["player-dashboard", id],
    queryFn: () => getPlayerDashboard(id, { last: 10 }),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });

  // Heatmap se carga por separado (lazy) para no bloquear el dashboard principal
  const { data: heatmapData, isLoading: heatmapLoading } = useQuery({
    queryKey: ["player-heatmap", id],
    queryFn: () => getPlayerHeatmap(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 5 * 60_000,   // el heatmap cambia poco — 5 min de cache
    gcTime: 10 * 60_000,
  });

  if (!Number.isInteger(id) || id <= 0) {
    return <div className="p-6 text-red-400">ID de jugador no válido</div>;
  }
  if (isLoading) {
    return <div className="p-6 text-[var(--geo-text-muted)]">Cargando dashboard...</div>;
  }
  if (isError || !data) {
    return <div className="p-6 text-red-400">Error al cargar el dashboard del jugador</div>;
  }

  const recentRatings = data.recentForm.map((r) => r.rating).reverse();
  const goalsPerMatch = data.matchesPlayed > 0 ? data.goals / data.matchesPlayed : 0;
  const overperformance = data.goalsMinusXG;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--geo-text)]">
              {data.player.name}
            </h1>
            <p className="text-sm text-[var(--geo-text-muted)]">
              {data.matchesPlayed} partidos · {data.minutesPlayed} minutos jugados
            </p>
          </div>
          <FavoriteStarButton
            entityType="player"
            entityId={id}
            label={data.player.name}
            size="md"
          />
        </div>
        {data.mvpCount > 0 && (
          <div className="rounded-xl border-2 border-yellow-500/40 bg-yellow-500/10 px-4 py-2">
            <div className="text-[10px] text-yellow-300 font-bold uppercase">🏆 MVPs</div>
            <div className="text-2xl font-black text-yellow-300">{data.mvpCount}</div>
          </div>
        )}
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Goles"
          value={data.goals}
          hint={`${goalsPerMatch.toFixed(2)} / partido`}
          accent={data.goals > 0 ? "emerald" : null}
        />
        <KpiCard
          label="Asistencias"
          value={data.assists}
          hint={`${data.keyPasses} pases clave`}
          accent={data.assists > 0 ? "sky" : null}
        />
        <KpiCard
          label="Rating promedio"
          value={data.avgRating.toFixed(2)}
          hint={`máx ${data.topRating.toFixed(2)}`}
          accent={data.avgRating >= 7 ? "emerald" : data.avgRating >= 6 ? "amber" : "red"}
        />
        <KpiCard
          label="Distancia"
          value={`${data.distanceKm} km`}
          hint={data.matchesPlayed > 0 ? `${(data.distanceKm / data.matchesPlayed).toFixed(1)} km/partido` : null}
        />
        <KpiCard
          label="Tiros"
          value={data.shots}
          hint={`${data.shotsOnTarget} al arco`}
        />
        <KpiCard
          label="Pase completado"
          value={`${(data.passAccuracy * 100).toFixed(0)}%`}
          hint={`${data.passesCompleted}/${data.passes}`}
        />
        <KpiCard
          label="xG acumulado"
          value={data.totalXG.toFixed(2)}
          hint={
            overperformance > 0.5 ? `+${overperformance.toFixed(2)} sobre lo esperado 🔥` :
            overperformance < -0.5 ? `${overperformance.toFixed(2)} bajo lo esperado` :
            "en línea con lo esperado"
          }
          accent={overperformance > 0.5 ? "emerald" : overperformance < -0.5 ? "red" : null}
        />
        <KpiCard
          label="Disciplina"
          value={`${data.yellowCards}🟨 / ${data.redCards}🟥`}
          hint={`${data.fouls} faltas`}
          accent={data.redCards > 0 ? "red" : data.yellowCards > 5 ? "amber" : null}
        />
      </div>

      {/* Galardones */}
      {(data.mvpCount > 0 || data.weeklyAwards > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.mvpCount > 0 && (
            <span className="rounded-full bg-yellow-500/20 text-yellow-300 px-3 py-1 text-xs font-bold">
              🏆 {data.mvpCount} MVP{data.mvpCount > 1 ? "s" : ""}
            </span>
          )}
          {data.weeklyAwards > 0 && (
            <span className="rounded-full bg-violet-500/20 text-violet-300 px-3 py-1 text-xs font-bold">
              ⭐ {data.weeklyAwards} jugador{data.weeklyAwards > 1 ? "es" : ""} de la jornada
            </span>
          )}
        </div>
      )}

      {/* Layout 2 columnas */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Heatmap — lazy, no bloquea el render del dashboard */}
        <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-[var(--geo-text)]">📍 Heatmap acumulado</h2>
            {heatmapData && (
              <span className="text-[10px] text-[var(--geo-text-muted)]">
                {heatmapData.matchesWithData}/{heatmapData.totalMatches} partidos
              </span>
            )}
          </div>
          {heatmapLoading ? (
            <div className="w-full rounded-lg bg-[var(--geo-bg)] animate-pulse" style={{ aspectRatio: "420/270" }} />
          ) : heatmapData && heatmapData.matchesWithData > 0 ? (
            <PlayerHeatmap grid={heatmapData.heatmap} width={420} height={270} />
          ) : (
            <p className="text-xs text-[var(--geo-text-muted)]">
              No hay datos de tracking en sus partidos.
            </p>
          )}
        </section>

        {/* Distribución de eventos */}
        <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">📊 Distribución de eventos</h2>
          <EventDistribution data={data} />
        </section>
      </div>

      {/* Forma reciente con sparkline */}
      <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <h2 className="text-sm font-bold text-[var(--geo-text)]">📈 Forma reciente</h2>
          {recentRatings.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--geo-text-muted)]">Rating últimos {recentRatings.length}:</span>
              <MiniRatingSparkline ratings={recentRatings} />
            </div>
          )}
        </div>

        {data.recentForm.length === 0 ? (
          <p className="text-xs text-[var(--geo-text-muted)]">Sin partidos jugados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="text-left text-[11px] text-[var(--geo-text-muted)] uppercase tracking-wider">
                <tr>
                  <th className="py-2">Fecha</th>
                  <th>Rival</th>
                  <th className="text-center">Resultado</th>
                  <th className="text-center">G</th>
                  <th className="text-center">A</th>
                  <th className="text-center">Min</th>
                  <th className="text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {data.recentForm.map((m) => (
                  <tr
                    key={m.matchId}
                    className="border-t border-[var(--geo-border)]/30 hover:bg-[var(--geo-bg)]/30"
                  >
                    <td className="py-2 text-xs text-[var(--geo-text-muted)]">{formatDate(m.date)}</td>
                    <td>
                      <Link
                        to={`/public/matches/${m.matchId}/detail`}
                        className="hover:text-emerald-400"
                      >
                        {m.opponent}
                      </Link>
                    </td>
                    <td className="text-center">
                      <span className={`inline-flex items-center justify-center w-16 px-2 py-0.5 rounded text-[10px] font-bold ${resultColor(m.result)}`}>
                        {m.result} {m.scoreFor}-{m.scoreAgainst}
                      </span>
                    </td>
                    <td className="text-center font-bold">{m.goals || ""}</td>
                    <td className="text-center font-bold">{m.assists || ""}</td>
                    <td className="text-center text-xs text-[var(--geo-text-muted)]">{m.minutes}'</td>
                    <td className={`text-right font-black ${ratingColor(m.rating)}`}>
                      {m.rating.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Ranking en equipo */}
      {data.scope.teamId && (data.teamRank.rating || data.teamRank.goals || data.teamRank.assists) && (
        <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h2 className="text-sm font-bold text-emerald-300 mb-2">🏅 Ranking en su equipo</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            {data.teamRank.rating && <span>Rating: <b>#{data.teamRank.rating}</b></span>}
            {data.teamRank.goals && <span>Goles: <b>#{data.teamRank.goals}</b></span>}
            {data.teamRank.assists && <span>Asistencias: <b>#{data.teamRank.assists}</b></span>}
          </div>
        </section>
      )}
    </div>
  );
}
