import { useAuth } from "@/hooks/useAuth";
import type { PublicNewsItem, Role } from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getAdminDashboardSummary } from "@/api/adminAPI";
import { getCoachDashboardSummary, getPlayerDashboardSummary } from "@/api/teamAPI";
import { getRefereeDashboardSummary } from "@/api/refereeAPI";
import {
  TrophyIcon,
  ClipboardDocumentListIcon,
  ShieldCheckIcon,
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
  PlayIcon,
  CheckBadgeIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { VictoryArea, VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryLine, VictoryPolarAxis, VictoryTooltip, VictoryVoronoiContainer } from "victory";

export default function DashboardView() {
  const { data: user } = useAuth();
  const role = (user?.role as Role) || "player";

  const { data: adminDashboard, isLoading: adminLoading } = useQuery({
    queryKey: ["adminDashboard", user?.id],
    queryFn: getAdminDashboardSummary,
    enabled: role === "admin",
  });

  const { data: coachDashboard, isLoading: coachLoading } = useQuery({
    queryKey: ["coachDashboard", user?.id],
    queryFn: getCoachDashboardSummary,
    enabled: role === "coach",
  });

  const { data: playerDashboard, isLoading: playerLoading } = useQuery({
    queryKey: ["playerDashboard", user?.id],
    queryFn: getPlayerDashboardSummary,
    enabled: role === "player",
  });

  const { data: refereeDashboard, isLoading: refereeLoading } = useQuery({
    queryKey: ["refereeDashboard", user?.id],
    queryFn: getRefereeDashboardSummary,
    enabled: role === "referee",
  });

  const formatDateTime = (date?: string | null) => {
    if (!date) return "Sin fecha";
    return new Date(date).toLocaleString();
  };

  const goalsChartData = (adminDashboard?.goalStatsByTeam ?? []).slice(0, 7).map((item) => ({
    x: `${item.teamName.slice(0, 10)}${item.teamName.length > 10 ? "…" : ""}`,
    gf: item.goalsFor,
    gc: item.goalsAgainst,
  }));

  const disciplineChartData = (adminDashboard?.disciplineByTeam ?? []).slice(0, 7).map((item) => ({
    x: `${item.teamName.slice(0, 10)}${item.teamName.length > 10 ? "…" : ""}`,
    y: item.yellowCards,
    r: item.redCards,
  }));

  const coachGoalsChartData = (coachDashboard?.goalsByTeam ?? []).slice(0, 7).map((item) => ({
    x: `${item.teamName.slice(0, 10)}${item.teamName.length > 10 ? "…" : ""}`,
    gf: item.goalsFor,
    gc: item.goalsAgainst,
  }));

  const coachCardsChartData = (coachDashboard?.cardsByTeam ?? []).slice(0, 7).map((item) => ({
    x: `${item.teamName.slice(0, 10)}${item.teamName.length > 10 ? "…" : ""}`,
    y: item.yellowCards,
    r: item.redCards,
  }));

  const playerRadarData = (() => {
    const radar = playerDashboard?.personalPerformance.radar ?? [];
    if (!radar.length) return [] as Array<{ x: string; y: number }>;
    const mapped = radar.map((point) => ({ x: point.metric, y: point.value }));
    return [...mapped, mapped[0]];
  })();

  const eventLabelMap: Record<string, string> = {
    goal: "Gol",
    penalty_scored: "Gol de penal",
    yellow_card: "Tarjeta amarilla",
    red_card: "Tarjeta roja",
    substitution: "Sustitución",
  };

  const playerTrendData = (playerDashboard?.performanceTrend ?? []).map((p) => ({
    x: p.label,
    rating: p.rating,
    contributions: p.contributions,
  }));

  const playerAchievements = playerDashboard?.achievements ?? [];

  const refereeStatusLabel: Record<string, string> = {
    pending: "Pendiente",
    in_progress: "En curso",
    closed: "Cerrado",
  };

  return (
    <div className="min-h-full w-full">
      <h1 className="font-geo text-4xl lg:text-5xl tracking-wide text-[var(--geo-text)] opacity-0 animate-in-up">
        Hola, {user?.name}
      </h1>
      <p className="mt-3 text-lg text-[var(--geo-text-muted)] opacity-0 animate-in-up stagger-1">
        {role === "admin" && "Administra tus ligas y equipos."}
        {role === "coach" && "Gestiona tus equipos y únete a ligas."}
        {role === "player" && "Revisa tus equipos, resultados y noticias."}
        {role === "referee" && "Gestiona tus partidos asignados como árbitro."}
      </p>

      {role === "admin" && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="card-pitch p-4 opacity-0 animate-in-up stagger-2">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Ligas disponibles</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{adminDashboard?.stats.leagues ?? 0}</p>
            </div>
            <div className="card-pitch p-4 opacity-0 animate-in-up stagger-3">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Próximos partidos</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{adminDashboard?.stats.nextMatches ?? 0}</p>
            </div>
            <div className="card-pitch p-4 opacity-0 animate-in-up stagger-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Admins asignados</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{adminDashboard?.stats.assignedAdmins ?? 0}</p>
            </div>
            <div className="card-pitch p-4 opacity-0 animate-in-up stagger-5">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Últimos resultados</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{adminDashboard?.stats.recentResults ?? 0}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <section className="card-pitch p-5 opacity-0 animate-in-up stagger-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Ligas disponibles</h2>
                <TrophyIcon className="h-5 w-5 text-geo-green" />
              </div>
              {adminLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : adminDashboard?.leagues.length ? (
                <ul className="space-y-2">
                  {adminDashboard.leagues.slice(0, 6).map((league) => (
                    <li key={league.id} className="rounded-lg border border-white/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--geo-text)]">{league.name}</p>
                          <p className="text-xs text-[var(--geo-text-muted)] line-clamp-1">{league.description || "Sin descripción"}</p>
                        </div>
                        <span className="rounded bg-geo-green/20 px-2 py-1 text-xs text-geo-green">
                          {league.teamsCount} equipos
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay ligas disponibles</p>
              )}
            </section>

            <section className="card-pitch p-5 opacity-0 animate-in-up stagger-7">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Próximos partidos</h2>
                <ClockIcon className="h-5 w-5 text-geo-green" />
              </div>
              {adminLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : adminDashboard?.nextMatches.length ? (
                <ul className="space-y-2">
                  {adminDashboard.nextMatches.slice(0, 6).map((match) => (
                    <li key={match.id} className="rounded-lg border border-white/10 p-3">
                      <p className="text-xs text-[var(--geo-text-muted)]">{match.league?.name || "Liga"} · {match.roundName}</p>
                      <p className="font-semibold text-[var(--geo-text)]">
                        {match.homeTeam?.name || "Local"} vs {match.awayTeam?.name || "Visitante"}
                      </p>
                      <p className="text-xs text-geo-green">{formatDateTime(match.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay partidos próximos</p>
              )}
            </section>

            <section className="card-pitch p-5 opacity-0 animate-in-up stagger-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Administradores asignados</h2>
                <ShieldCheckIcon className="h-5 w-5 text-geo-green" />
              </div>
              {adminLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : adminDashboard?.adminsByLeague.length ? (
                <ul className="space-y-2">
                  {adminDashboard.adminsByLeague.slice(0, 6).map((item) => (
                    <li key={item.leagueId} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold text-[var(--geo-text)]">{item.leagueName}</p>
                      <p className="text-xs text-[var(--geo-text-muted)]">
                        Principal: {item.principal?.name || "Sin principal"}
                      </p>
                      <p className="text-xs text-[var(--geo-text-muted)]">
                        Asistentes: {item.assistants.length} · Árbitros: {item.referees.length}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay asignaciones</p>
              )}
            </section>

            <section className="card-pitch p-5 opacity-0 animate-in-up stagger-9">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Últimos resultados</h2>
                <ClipboardDocumentListIcon className="h-5 w-5 text-geo-green" />
              </div>
              {adminLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : adminDashboard?.recentResults.length ? (
                <ul className="space-y-2">
                  {adminDashboard.recentResults.slice(0, 6).map((match) => (
                    <li key={match.id} className="rounded-lg border border-white/10 p-3">
                      <p className="text-xs text-[var(--geo-text-muted)]">{match.league?.name || "Liga"}</p>
                      <p className="font-semibold text-[var(--geo-text)]">
                        {match.homeTeam?.name || "Local"} {match.homeScore} - {match.awayScore} {match.awayTeam?.name || "Visitante"}
                      </p>
                      <p className="text-xs text-[var(--geo-text-muted)]">{formatDateTime(match.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay resultados recientes</p>
              )}
            </section>

            <section className="card-pitch p-5 opacity-0 animate-in-up stagger-9 xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="font-geo text-xl text-[var(--geo-text)]">Gráfica de goles (GF vs GC)</h2>
                  <p className="mb-2 text-xs text-[var(--geo-text-muted)]">Equipos de tus ligas con más goles a favor</p>
                  {goalsChartData.length ? (
                    <VictoryChart
                      domainPadding={{ x: 18, y: 12 }}
                      height={260}
                      containerComponent={
                        <VictoryVoronoiContainer
                          labels={({ datum }) => `${datum.x}\nGF: ${datum.gf} · GC: ${datum.gc}`}
                          labelComponent={
                            <VictoryTooltip
                              flyoutStyle={{ fill: "#18181b", stroke: "#27272a" }}
                              style={{ fill: "#fff", fontSize: 10 }}
                              cornerRadius={6}
                            />
                          }
                        />
                      }
                    >
                      <VictoryAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -25, padding: 14 },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryGroup offset={10} colorScale={["#39FF14", "#f97316"]}>
                        <VictoryBar data={goalsChartData} x="x" y="gf" barWidth={8} />
                        <VictoryBar data={goalsChartData} x="x" y="gc" barWidth={8} />
                      </VictoryGroup>
                    </VictoryChart>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Sin datos para graficar goles.</p>
                  )}
                </div>

                <div>
                  <h2 className="font-geo text-xl text-[var(--geo-text)]">Gráfica disciplinaria</h2>
                  <p className="mb-2 text-xs text-[var(--geo-text-muted)]">Tarjetas amarillas y rojas por equipo</p>
                  {disciplineChartData.length ? (
                    <VictoryChart
                      domainPadding={{ x: 18, y: 12 }}
                      height={260}
                      containerComponent={
                        <VictoryVoronoiContainer
                          labels={({ datum }) => `${datum.x}\nAmarillas: ${datum.y} · Rojas: ${datum.r}`}
                          labelComponent={
                            <VictoryTooltip
                              flyoutStyle={{ fill: "#18181b", stroke: "#27272a" }}
                              style={{ fill: "#fff", fontSize: 10 }}
                              cornerRadius={6}
                            />
                          }
                        />
                      }
                    >
                      <VictoryAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -25, padding: 14 },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryGroup offset={10} colorScale={["#facc15", "#ef4444"]}>
                        <VictoryBar data={disciplineChartData} x="x" y="y" barWidth={8} />
                        <VictoryBar data={disciplineChartData} x="x" y="r" barWidth={8} />
                      </VictoryGroup>
                    </VictoryChart>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Sin eventos disciplinarios para graficar.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <NewsPanel title="Noticias del ecosistema" items={adminDashboard?.news ?? []} loading={adminLoading} />
        </>
      )}

      {role === "coach" && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Partidos jugados</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{coachDashboard?.stats.playedMatches ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Puntos</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{coachDashboard?.stats.points ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Goles a favor</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{coachDashboard?.stats.goalsFor ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Goles en contra</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{coachDashboard?.stats.goalsAgainst ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Racha</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{coachDashboard?.stats.streak ?? "-"}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Próximos partidos</h2>
                <MapPinIcon className="h-5 w-5 text-geo-green" />
              </div>
              {coachLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : coachDashboard?.upcomingMatches.length ? (
                <ul className="space-y-3">
                  {coachDashboard.upcomingMatches.slice(0, 5).map((match) => (
                    <li key={match.id} className="rounded-xl border border-white/10 p-3">
                      <p className="text-xs text-[var(--geo-text-muted)]">{match.leagueName} · {match.roundName}</p>
                      <p className="font-semibold text-[var(--geo-text)]">{match.teamName} vs {match.opponentName}</p>
                      <p className="text-xs text-geo-green">{formatDateTime(match.date)}</p>
                      {match.location?.lat != null && match.location?.lng != null ? (
                        <div className="mt-2 overflow-hidden rounded-lg border border-white/10">
                          <iframe
                            title={`map-${match.id}`}
                            src={`https://maps.google.com/maps?q=${match.location.lat},${match.location.lng}&z=14&output=embed`}
                            className="h-28 w-full"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-[var(--geo-text-muted)]">Ubicación pendiente</p>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay próximos partidos.</p>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Últimos resultados + tendencia</h2>
                <TrophyIcon className="h-5 w-5 text-geo-green" />
              </div>
              <div className="mb-3 flex gap-2">
                <span className="rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-400">W: {coachDashboard?.trend.W ?? 0}</span>
                <span className="rounded bg-slate-500/20 px-2 py-1 text-xs text-slate-300">D: {coachDashboard?.trend.D ?? 0}</span>
                <span className="rounded bg-rose-500/20 px-2 py-1 text-xs text-rose-400">L: {coachDashboard?.trend.L ?? 0}</span>
              </div>
              {coachLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : coachDashboard?.recentResults.length ? (
                <ul className="space-y-2">
                  {coachDashboard.recentResults.slice(0, 6).map((match) => (
                    <li key={match.id} className="rounded-lg border border-white/10 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--geo-text)]">
                          {match.homeTeam?.name || "Local"} {match.homeScore} - {match.awayScore} {match.awayTeam?.name || "Visitante"}
                        </p>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            match.result === "W"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : match.result === "D"
                                ? "bg-slate-500/20 text-slate-300"
                                : "bg-rose-500/20 text-rose-400"
                          }`}
                        >
                          {match.result}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--geo-text-muted)]">{formatDateTime(match.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay resultados recientes.</p>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Top jugadores</h2>
                <UserGroupIcon className="h-5 w-5 text-geo-green" />
              </div>
              {coachLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : coachDashboard?.topPlayers.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[var(--geo-text-muted)]">
                        <th className="pb-2">Jugador</th>
                        <th className="pb-2">G</th>
                        <th className="pb-2">A</th>
                        <th className="pb-2">TA</th>
                        <th className="pb-2">TR</th>
                        <th className="pb-2">Min</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coachDashboard.topPlayers.map((player) => (
                        <tr key={`${player.playerId}-${player.name}`} className="border-t border-white/10">
                          <td className="py-2 font-medium text-[var(--geo-text)]">{player.name}</td>
                          <td className="py-2 text-[var(--geo-text-muted)]">{player.goals}</td>
                          <td className="py-2 text-[var(--geo-text-muted)]">{player.assists}</td>
                          <td className="py-2 text-yellow-400">{player.yellowCards}</td>
                          <td className="py-2 text-red-400">{player.redCards}</td>
                          <td className="py-2 text-[var(--geo-text-muted)]">{player.minutes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">Sin datos de jugadores.</p>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Checklist prepartido</h2>
                <ClipboardDocumentListIcon className="h-5 w-5 text-geo-green" />
              </div>
              {coachLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : coachDashboard?.preMatchChecklist.length ? (
                <ul className="space-y-3">
                  {coachDashboard.preMatchChecklist.map((item) => (
                    <li key={item.matchId} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold text-[var(--geo-text)]">{item.teamName} vs {item.opponentName}</p>
                      <p className="text-xs text-[var(--geo-text-muted)]">{item.leagueName} · {item.roundName} · {formatDateTime(item.date)}</p>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <ChecklistBadge label="Convocatoria" ok={item.checklist.convocatoria} />
                        <ChecklistBadge label="Alineación" ok={item.checklist.alineacion} />
                        <ChecklistBadge label="Cancha" ok={item.checklist.cancha} />
                        <ChecklistBadge label="Horario" ok={item.checklist.horario} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay partidos para checklist.</p>
              )}
            </section>

            <section className="card-pitch p-5 xl:col-span-2">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h2 className="font-geo text-xl text-[var(--geo-text)]">Gráfica de goles</h2>
                  <p className="mb-2 text-xs text-[var(--geo-text-muted)]">Goles a favor vs en contra por equipo</p>
                  {coachLoading ? (
                    <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
                  ) : coachGoalsChartData.length ? (
                    <VictoryChart domainPadding={{ x: 18, y: 12 }} height={250}>
                      <VictoryAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -20, padding: 12 },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryGroup offset={10} colorScale={["#39FF14", "#f97316"]}>
                        <VictoryBar data={coachGoalsChartData} x="x" y="gf" barWidth={8} />
                        <VictoryBar data={coachGoalsChartData} x="x" y="gc" barWidth={8} />
                      </VictoryGroup>
                    </VictoryChart>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Sin datos de goles.</p>
                  )}
                </div>

                <div>
                  <h2 className="font-geo text-xl text-[var(--geo-text)]">Gráfica de tarjetas</h2>
                  <p className="mb-2 text-xs text-[var(--geo-text-muted)]">Amarillas y rojas por equipo</p>
                  {coachLoading ? (
                    <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
                  ) : coachCardsChartData.length ? (
                    <VictoryChart domainPadding={{ x: 18, y: 12 }} height={250}>
                      <VictoryAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -20, padding: 12 },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryGroup offset={10} colorScale={["#facc15", "#ef4444"]}>
                        <VictoryBar data={coachCardsChartData} x="x" y="y" barWidth={8} />
                        <VictoryBar data={coachCardsChartData} x="x" y="r" barWidth={8} />
                      </VictoryGroup>
                    </VictoryChart>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Sin datos de tarjetas.</p>
                  )}
                </div>
              </div>
            </section>
          </div>

          <NewsPanel title="Noticias para entrenadores" items={coachDashboard?.news ?? []} loading={coachLoading} />
        </>
      )}

      {role === "player" && (
        <>
          <div className="mt-8 card-pitch p-6">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-geo text-2xl text-[var(--geo-text)]">Próximo juego</h2>
              <ClockIcon className="h-5 w-5 text-geo-green" />
            </div>
            {playerLoading ? (
              <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
            ) : playerDashboard?.nextMatch ? (
              <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                <div>
                  <p className="text-sm text-[var(--geo-text-muted)]">{playerDashboard.nextMatch.roundName}</p>
                  <p className="text-xl font-semibold text-[var(--geo-text)]">
                    {playerDashboard.nextMatch.homeTeam?.name || "Local"} vs {playerDashboard.nextMatch.awayTeam?.name || "Visitante"}
                  </p>
                  <p className="mt-1 text-sm text-geo-green">{formatDateTime(playerDashboard.nextMatch.date)}</p>
                  <p className="mt-1 text-sm text-[var(--geo-text-muted)]">
                    Cancha: {playerDashboard.nextMatch.fieldAddress || "Por confirmar"}
                  </p>
                  {playerDashboard.nextMatch.location?.lat != null && playerDashboard.nextMatch.location?.lng != null ? (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${playerDashboard.nextMatch.location.lat},${playerDashboard.nextMatch.location.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex rounded-lg border border-geo-green/40 px-3 py-2 text-sm font-semibold text-geo-green hover:bg-geo-green/10"
                    >
                      Cómo llegar
                    </a>
                  ) : null}
                </div>
                {playerDashboard.nextMatch.location?.lat != null && playerDashboard.nextMatch.location?.lng != null ? (
                  <div className="overflow-hidden rounded-xl border border-white/10">
                    <iframe
                      title="mini-map-next-match"
                      src={`https://maps.google.com/maps?q=${playerDashboard.nextMatch.location.lat},${playerDashboard.nextMatch.location.lng}&z=14&output=embed`}
                      className="h-44 w-full"
                      loading="lazy"
                    />
                  </div>
                ) : (
                  <div className="flex h-44 items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-[var(--geo-text-muted)]">
                    Sin mapa disponible
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-[var(--geo-text-muted)]">No tienes próximos juegos.</p>
            )}
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Últimos resultados del equipo</h2>
                <TrophyIcon className="h-5 w-5 text-geo-green" />
              </div>
              {playerLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : playerDashboard?.recentTeamResults.length ? (
                <ul className="space-y-2">
                  {playerDashboard.recentTeamResults.slice(0, 6).map((match) => (
                    <li key={match.id} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold text-[var(--geo-text)]">
                        {match.homeTeam?.name || "Local"} {match.homeScore} - {match.awayScore} {match.awayTeam?.name || "Visitante"}
                      </p>
                      <p className="text-xs text-[var(--geo-text-muted)]">{formatDateTime(match.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">Sin resultados recientes.</p>
              )}
            </section>

            <section className="card-pitch min-w-0 overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Rendimiento personal</h2>
                <UserGroupIcon className="h-5 w-5 text-geo-green" />
              </div>
              {playerLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : (
                <>
                  <div className="mb-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-lg border border-white/10 p-2">
                      <p className="text-[10px] uppercase text-[var(--geo-text-muted)]">Rating prom.</p>
                      <p className="text-lg font-bold text-geo-green">{playerDashboard?.personalPerformance.averageRating ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 p-2">
                      <p className="text-[10px] uppercase text-[var(--geo-text-muted)]">Minutos</p>
                      <p className="text-lg font-bold text-[var(--geo-text)]">{playerDashboard?.personalPerformance.minutes ?? 0}</p>
                    </div>
                    <div className="rounded-lg border border-white/10 p-2">
                      <p className="text-[10px] uppercase text-[var(--geo-text-muted)]">Contribuciones</p>
                      <p className="text-lg font-bold text-[var(--geo-text)]">{playerDashboard?.personalPerformance.contributions ?? 0}</p>
                    </div>
                  </div>
                  {playerRadarData.length ? (
                    <div className="w-full overflow-hidden [&_svg]:!w-full [&_svg]:max-w-full">
                    <VictoryChart polar height={280} domain={{ y: [0, 100] }}>
                      <VictoryPolarAxis
                        tickValues={playerRadarData.slice(0, -1).map((point) => point.x)}
                        style={{
                          tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                          axis: { stroke: "#27272a" },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryPolarAxis
                        dependentAxis
                        tickFormat={() => ""}
                        style={{
                          axis: { stroke: "#27272a" },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryArea
                        data={playerRadarData}
                        style={{
                          data: { fill: "rgba(57,255,20,0.35)", stroke: "#39FF14", strokeWidth: 2 },
                        }}
                      />
                    </VictoryChart>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Sin datos de rendimiento.</p>
                  )}
                </>
              )}
            </section>

            <section className="card-pitch min-w-0 overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Evolución y logros</h2>
                <TrophyIcon className="h-5 w-5 text-geo-green" />
              </div>
              {playerLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : (
                <>
                  {playerTrendData.length ? (
                    <div className="w-full overflow-hidden [&_svg]:!w-full [&_svg]:max-w-full">
                    <VictoryChart domainPadding={{ x: 16, y: 10 }} height={220}>
                      <VictoryAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                        }}
                      />
                      <VictoryAxis
                        dependentAxis
                        style={{
                          axis: { stroke: "#3f3f46" },
                          tickLabels: { fill: "#a1a1aa", fontSize: 9 },
                          grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                        }}
                      />
                      <VictoryBar data={playerTrendData} x="x" y="contributions" barWidth={10} style={{ data: { fill: "rgba(57,255,20,0.35)" } }} />
                      <VictoryLine data={playerTrendData} x="x" y="rating" style={{ data: { stroke: "#39FF14", strokeWidth: 2 } }} />
                    </VictoryChart>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--geo-text-muted)]">Aún no hay suficientes partidos para evolución.</p>
                  )}

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {playerAchievements.map((badge) => (
                      <div
                        key={badge.key}
                        className={`h-full rounded-lg border p-3 ${
                          badge.unlocked
                            ? "border-geo-green/40 bg-geo-green/10"
                            : "border-white/10 bg-white/5"
                        }`}
                      >
                        <p className={`text-sm font-bold leading-tight ${badge.unlocked ? "text-geo-green" : "text-[var(--geo-text)]"}`}>
                          {badge.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[var(--geo-text-muted)]">{badge.description}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Eventos recientes</h2>
                <ClipboardDocumentListIcon className="h-5 w-5 text-geo-green" />
              </div>
              {playerLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : playerDashboard?.recentEvents.length ? (
                <ul className="space-y-2">
                  {playerDashboard.recentEvents.map((event) => (
                    <li key={event.id} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold text-[var(--geo-text)]">{eventLabelMap[event.eventType] || event.eventType}</p>
                      <p className="text-xs text-[var(--geo-text-muted)]">
                        {event.match?.homeTeam?.name || "Local"} vs {event.match?.awayTeam?.name || "Visitante"} · {event.minute}'
                        {event.extraMinute ? `+${event.extraMinute}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No hay eventos recientes.</p>
              )}
            </section>

          </div>

          <NewsPanel title="Noticias para jugadores" items={playerDashboard?.news ?? []} loading={playerLoading} />
        </>
      )}

      {role === "referee" && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Asignados esta semana</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{refereeDashboard?.stats.assignedWeek ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Check-ins</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{refereeDashboard?.stats.checkIns ?? 0}</p>
            </div>
            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Partidos cerrados</p>
              <p className="mt-2 text-3xl font-geo text-[var(--geo-text)]">{refereeDashboard?.stats.closedMatches ?? 0}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-5 xl:grid-cols-2">
            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Próximos partidos asignados</h2>
                <ClockIcon className="h-5 w-5 text-geo-green" />
              </div>
              {refereeLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : refereeDashboard?.upcomingAssignedMatches.length ? (
                <ul className="space-y-2">
                  {refereeDashboard.upcomingAssignedMatches.slice(0, 8).map((a) => (
                    <li key={a.id} className="rounded-lg border border-white/10 p-3">
                      <p className="text-xs text-[var(--geo-text-muted)]">{(a.match as any)?.league?.name || "Liga"} · {a.match?.roundName || "Partido"}</p>
                      <p className="font-semibold text-[var(--geo-text)]">
                        {a.match?.homeTeam?.name || "Local"} vs {a.match?.awayTeam?.name || "Visitante"}
                      </p>
                      <p className="text-xs text-geo-green">{formatDateTime(a.match?.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">No tienes partidos próximos asignados.</p>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Estado del partido</h2>
                <CheckBadgeIcon className="h-5 w-5 text-geo-green" />
              </div>
              {refereeLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : refereeDashboard?.matchStatus.length ? (
                <ul className="space-y-2">
                  {refereeDashboard.matchStatus.map((s) => (
                    <li key={s.assignmentId} className="rounded-lg border border-white/10 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-[var(--geo-text)]">
                          {s.match?.homeTeam?.name || "Local"} vs {s.match?.awayTeam?.name || "Visitante"}
                        </p>
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-bold ${
                            s.status === "closed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : s.status === "in_progress"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {refereeStatusLabel[s.status] || s.status}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--geo-text-muted)]">{formatDateTime(s.match?.date)}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">Sin estados disponibles.</p>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Atajos rápidos</h2>
                <PlayIcon className="h-5 w-5 text-geo-green" />
              </div>
              {refereeLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : (
                <div className="space-y-2">
                  {(refereeDashboard?.quickActions ?? []).map((action) => (
                    <Link
                      key={action.key}
                      to={action.path}
                      className="flex items-center justify-between rounded-lg border border-white/10 p-3 hover:border-geo-green/40"
                    >
                      <div>
                        <p className="font-semibold text-[var(--geo-text)]">{action.label}</p>
                        <p className="text-xs text-[var(--geo-text-muted)]">{action.description}</p>
                      </div>
                      <ArrowTopRightOnSquareIcon className="h-4 w-4 text-geo-green" />
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="card-pitch p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-geo text-xl text-[var(--geo-text)]">Historial reciente</h2>
                <ClipboardDocumentListIcon className="h-5 w-5 text-geo-green" />
              </div>
              {refereeLoading ? (
                <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
              ) : refereeDashboard?.recentHistory.length ? (
                <ul className="space-y-2">
                  {refereeDashboard.recentHistory.map((h) => (
                    <li key={h.assignmentId} className="rounded-lg border border-white/10 p-3">
                      <p className="font-semibold text-[var(--geo-text)]">
                        {h.match?.homeTeam?.name || "Local"} vs {h.match?.awayTeam?.name || "Visitante"}
                      </p>
                      <p className="text-xs text-[var(--geo-text-muted)]">{formatDateTime(h.match?.date)}</p>
                      <p className="mt-1 text-xs text-[var(--geo-text-muted)]">
                        Eventos: {h.metrics.eventsCount} · Goles: {h.metrics.goals} · Tarjetas: {h.metrics.cards} · Tracking: {h.metrics.trackingFrames}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">Aún no hay historial arbitral.</p>
              )}
            </section>
          </div>

          <NewsPanel title="Noticias para árbitros" items={refereeDashboard?.news ?? []} loading={refereeLoading} />
        </>
      )}

      {role !== "admin" && role !== "coach" && role !== "player" && role !== "referee" && (
        <div className="mt-8 card-pitch p-6">
          <p className="text-sm text-[var(--geo-text-muted)]">
            Las acciones del sistema ahora están en el menú lateral para que siempre estén disponibles.
          </p>
        </div>
      )}

    </div>
  );
}

function NewsPanel({ title, items, loading }: { title: string; items: PublicNewsItem[]; loading: boolean }) {
  return (
    <section className="mt-8 card-pitch p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-geo text-xl text-[var(--geo-text)]">{title}</h2>
        <DocumentTextIcon className="h-5 w-5 text-geo-green" />
      </div>
      {loading ? (
        <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
      ) : items.length ? (
        <ul className="space-y-2">
          {items.slice(0, 6).map((item) => (
            <li key={item.id} className="rounded-lg border border-white/10 p-3">
              <p className="text-xs text-[var(--geo-text-muted)]">{new Date(item.createdAt).toLocaleString()} · {item.leagueName || "Geo-Goal"}</p>
              <p className="font-semibold text-[var(--geo-text)]">{item.title}</p>
              <p className="text-xs text-[var(--geo-text-muted)]">{item.summary}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--geo-text-muted)]">No hay noticias disponibles.</p>
      )}
    </section>
  );
}

function ChecklistBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`rounded px-2 py-1 ${
        ok ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
      }`}
    >
      {label}: {ok ? "OK" : "Pendiente"}
    </span>
  );
}
