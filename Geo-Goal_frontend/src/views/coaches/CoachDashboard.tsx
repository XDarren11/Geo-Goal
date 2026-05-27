/**
 * CoachDashboard — Fase 8.E
 *
 * Stats agregadas del coach:
 *   - Equipos que dirige + Elo actual
 *   - Win rate global
 *   - Estilo táctico (ofensivo vs defensivo)
 *   - Formación favorita
 *   - Mejores jugadores formados
 *   - Forma reciente
 *
 * Cualquier usuario puede acceder a /coaches/:coachId/dashboard
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCoachDashboard } from "@/api/publicAPI";
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

/** Barra horizontal mostrando posición del coach en el espectro defensivo/ofensivo */
function StyleBar({ attackingIndex }: { attackingIndex: number }) {
  const pct = Math.max(0, Math.min(100, attackingIndex * 100));
  let label = "Equilibrado";
  if (attackingIndex > 0.6) label = "Ofensivo";
  else if (attackingIndex < 0.4) label = "Defensivo";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-red-300">Defensivo</span>
        <span className="font-bold text-emerald-300">{label} ({pct.toFixed(0)}%)</span>
        <span className="text-emerald-300">Ofensivo</span>
      </div>
      <div className="relative h-3 rounded-full bg-gradient-to-r from-red-500/40 via-zinc-500/40 to-emerald-500/40 overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-lg"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        />
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  const { coachId } = useParams<{ coachId: string }>();
  const id = Number(coachId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["coach-dashboard", id],
    queryFn: () => getCoachDashboard(id),
    enabled: Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });

  if (!Number.isInteger(id) || id <= 0) {
    return <div className="p-6 text-red-400">ID de coach no válido</div>;
  }
  if (isLoading) {
    return <div className="p-6 text-[var(--geo-text-muted)]">Cargando dashboard del coach...</div>;
  }
  if (isError || !data) {
    return <div className="p-6 text-red-400">Error al cargar el dashboard del coach</div>;
  }

  const formationEntries = Object.entries(data.formationDistribution).sort((a, b) => b[1] - a[1]);
  const recentStreak = data.recentResults.slice(0, 10).map((r) => r.result).join("");

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--geo-text)]">
              👨‍🏫 {data.coach.name}
            </h1>
            <p className="text-sm text-[var(--geo-text-muted)]">
              {data.totalMatches} partidos dirigidos
            </p>
          </div>
          <FavoriteStarButton
            entityType="coach"
            entityId={id}
            label={data.coach.name}
            size="md"
          />
        </div>
        {recentStreak && (
          <div className="flex gap-1">
            {recentStreak.split("").map((r, i) => (
              <span
                key={i}
                className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-black ${resultBadgeClass(r as "W" | "D" | "L")}`}
              >
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Equipos dirigidos (histórico) */}
      {data.teamsManaged.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-[var(--geo-text)] mb-2">⚽ Equipos dirigidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.teamsManaged.map((t) => {
              const winRate = t.matches > 0 ? t.wins / t.matches : 0;
              return (
                <Link
                  key={t.teamId}
                  to={`/teams/${t.teamId}/dashboard`}
                  className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-3 hover:border-emerald-500/50 transition"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.teamName} className="w-8 h-8 rounded object-contain bg-white/5" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center text-sm">⚽</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm truncate">{t.teamName}</div>
                      <div className="text-[10px] text-[var(--geo-text-muted)]">{t.matches}PJ · {t.wins}V · Elo {t.currentElo}</div>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--geo-bg)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${winRate >= 0.5 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.round(winRate * 100)}%` }}
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* KPIs globales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Win rate"
          value={`${(data.winRate * 100).toFixed(0)}%`}
          hint={`${data.wins}V · ${data.draws}E · ${data.losses}D`}
          accent={data.winRate >= 0.6 ? "emerald" : data.winRate < 0.35 ? "red" : "amber"}
        />
        <KpiCard
          label="Puntos / partido"
          value={data.pointsPerMatch.toFixed(2)}
          hint={`máx posible 3.00`}
          accent={data.pointsPerMatch >= 2 ? "emerald" : data.pointsPerMatch < 1 ? "red" : "amber"}
        />
        <KpiCard
          label="Goles a favor"
          value={(data.avgGoalsFor ?? data.avgGoalsScored ?? 0).toFixed(2)}
          hint="por partido"
          accent="emerald"
        />
        <KpiCard
          label="Goles en contra"
          value={(data.avgGoalsAgainst ?? data.avgGoalsConceded ?? 0).toFixed(2)}
          hint="por partido"
          accent={(data.avgGoalsAgainst ?? data.avgGoalsConceded ?? 0) < 1 ? "emerald" : (data.avgGoalsAgainst ?? data.avgGoalsConceded ?? 0) > 2 ? "red" : "amber"}
        />
      </div>

      {/* Estilo táctico */}
      <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">🎯 Estilo táctico</h2>
        <StyleBar attackingIndex={data.attackingIndex} />
        <div className="mt-3 text-xs text-[var(--geo-text-muted)]">
          Calculado desde la proporción goles a favor / (goles a favor + en contra) en todos los partidos dirigidos.
        </div>
      </section>

      {/* Formación favorita */}
      {formationEntries.length > 0 && (
        <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
          <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">📐 Formación favorita</h2>
          <div className="flex items-center gap-6">
            <div className="text-5xl font-black text-emerald-400">{data.mostUsedFormation}</div>
            <div className="flex-1 space-y-1 text-xs">
              {formationEntries.slice(0, 5).map(([f, n]) => {
                const total = formationEntries.reduce((s, [, c]) => s + c, 0);
                const pct = total > 0 ? (n / total) * 100 : 0;
                return (
                  <div key={f}>
                    <div className="flex justify-between mb-0.5">
                      <span>{f}</span>
                      <span>{n}× ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-1.5 rounded bg-[var(--geo-bg)] overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Jugadores formados */}
      <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">⭐ Mejores jugadores formados</h2>
        {(data.topFormedPlayers ?? data.topPlayersFormed ?? []).length === 0 ? (
          <p className="text-xs text-[var(--geo-text-muted)]">
            Aún no hay jugadores con suficientes partidos bajo su dirección (mínimo 3).
          </p>
        ) : (
          <ul className="space-y-1">
            {(data.topFormedPlayers ?? data.topPlayersFormed ?? []).map((p: any, idx: number) => (
              <li key={`${p.playerId}-${idx}`} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--geo-border)]/20 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-5 text-xs text-[var(--geo-text-muted)] text-right">{idx + 1}.</span>
                  <Link to={`/players/${p.playerId}/dashboard`} className="font-bold hover:text-emerald-400 truncate">
                    {p.name}
                  </Link>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-300">{p.goals ?? p.matchesUnderCoach ?? 0}G</span>
                  <span className="font-black text-emerald-300">{p.avgRating.toFixed(2)}★</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Forma reciente */}
      <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
        <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">📈 Últimos resultados</h2>
        {data.recentResults.length === 0 ? (
          <p className="text-xs text-[var(--geo-text-muted)]">Sin partidos recientes.</p>
        ) : (
          <ul className="space-y-1">
            {data.recentResults.map((r) => (
              <li key={r.matchId} className="flex items-center justify-between gap-2 py-1.5 border-b border-[var(--geo-border)]/20 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`inline-flex w-7 h-7 items-center justify-center rounded text-xs font-black ${resultBadgeClass(r.result)}`}>
                    {r.result}
                  </span>
                  <Link to={`/public/matches/${r.matchId}/detail`} className="hover:text-emerald-400 text-sm truncate">
                    vs {r.opponentName}
                  </Link>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--geo-text-muted)]">
                  <span className="font-mono">{r.score}</span>
                  <span>{formatDate(r.date)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
