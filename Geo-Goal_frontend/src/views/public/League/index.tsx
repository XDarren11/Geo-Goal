import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicLeagueDetail } from "@/api/publicAPI";
import { useTheme } from "@/context/ThemeContext";
import { WeeklyAwardCard } from "@/components/WeeklyAwardCard";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MapPinIcon,
  NewspaperIcon,
  SunIcon,
  MoonIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from "victory";

// 👇 1. IMPORTAMOS TU COMPONENTE DE GOLEADORES (Ajusta la ruta según la estructura de tus carpetas)
import TopScorersTable from "@/components/TableGoal/TopScorersTable"; 

export default function PublicLeagueView() {
  const { leagueId } = useParams();
  const parsedLeagueId = Number(leagueId);
  const { theme, toggleTheme } = useTheme();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-league-detail", parsedLeagueId],
    queryFn: () => getPublicLeagueDetail(parsedLeagueId),
    enabled: Number.isInteger(parsedLeagueId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-full border-2 border-geo-green border-t-transparent animate-spin" />
          <p className="mt-4 text-[var(--geo-text-muted)]">Cargando información pública…</p>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[var(--geo-bg)] pitch-stripes px-4 py-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-red-500/30 bg-red-500/10 p-8 text-center text-red-600 dark:text-red-400">
          No se pudo cargar la liga pública.
          <div className="mt-4">
            <Link to="/public" className="text-geo-green hover:underline">
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const standingRows = data.standings.slice(0, 8);
  const latestNews = data.news.slice(0, 5);
  const teamPreview = data.teams.slice(0, 6);
  const fieldPreview = data.fields.slice(0, 4);
  const fixtureRounds = Object.entries(data.fixture);
  const standingsChartData = data.standings.slice(0, 8).map((row) => ({
    x: row.team?.name || `T${row.team?.id ?? row.id}`,
    pts: row.points,
    gd: row.goalDifference,
  }));
  const playedMatches = data.recentMatches.filter((m) => m.played).length;
  const totalGoals = data.recentMatches.reduce((acc, m) => acc + Number(m.homeScore ?? 0) + Number(m.awayScore ?? 0), 0);
  const avgGoals = playedMatches ? (totalGoals / playedMatches).toFixed(2) : "0.00";

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] text-[var(--geo-text)] pitch-stripes transition-colors duration-300">
      <header className="sticky top-0 z-30 border-b-4 border-geo-green bg-white/90 backdrop-blur dark:bg-geo-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <Link to="/public" className="flex items-center gap-3 text-sm font-semibold text-[var(--geo-text-muted)] transition hover:text-geo-green">
            <ArrowLeftIcon className="h-5 w-5" />
            Inicio público
          </Link>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-full border-2 border-geo-green p-2 text-geo-black transition hover:scale-105 hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:bg-geo-green dark:hover:text-geo-black"
              aria-label={theme === "dark" ? "Modo claro" : "Modo oscuro"}
            >
              {theme === "dark" ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <Link to="/auth/login" className="rounded-full border-2 border-geo-green px-4 py-2 text-sm font-semibold text-geo-black transition hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:text-geo-black">
              Ingresar
            </Link>
            <Link to="/auth/register" className="rounded-full bg-geo-green px-4 py-2 text-sm font-semibold text-geo-black transition hover:brightness-110">
              Registrar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-10">
        <section className="card-pitch overflow-hidden border border-geo-green/20 p-6 lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex rounded-full border border-geo-green/30 bg-geo-green/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-geo-green">
                Vista pública de liga
              </div>
              <h1 className="font-geo text-4xl tracking-wide lg:text-6xl">{data.league.name}</h1>
              <p className="max-w-3xl text-lg leading-relaxed text-[var(--geo-text-muted)]">
                {data.league.description || "Liga pública registrada en Geo-Goal con información visible para cualquier visitante."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Temporada actual</p>
                <p className="mt-2 font-geo text-2xl text-geo-green">{data.currentSeason?.name || "Sin temporada"}</p>
                <p className="text-sm text-[var(--geo-text-muted)]">{data.currentSeason ? `${data.currentSeason.year} · ${data.currentSeason.status}` : "Aún no se definió una temporada activa."}</p>
              </div>
              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Equipos públicos</p>
                <p className="mt-2 font-geo text-2xl text-geo-green">{data.teams.length}</p>
                <p className="text-sm text-[var(--geo-text-muted)]">Con tabla, fixture y actividad visibles.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card-pitch p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Partidos recientes</p>
            <p className="mt-2 font-geo text-3xl text-geo-green">{data.recentMatches.length}</p>
            <p className="text-sm text-[var(--geo-text-muted)]">Actividad registrada públicamente</p>
          </div>
          <div className="card-pitch p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Partidos jugados</p>
            <p className="mt-2 font-geo text-3xl text-geo-green">{playedMatches}</p>
            <p className="text-sm text-[var(--geo-text-muted)]">Base para análisis y tendencias</p>
          </div>
          <div className="card-pitch p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Promedio de goles</p>
            <p className="mt-2 font-geo text-3xl text-geo-green">{avgGoals}</p>
            <p className="text-sm text-[var(--geo-text-muted)]">Por partido jugado</p>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="card-pitch p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Puntos por equipo</h2>
              <ChartBarIcon className="h-6 w-6 text-geo-green" />
            </div>
            {standingsChartData.length ? (
              <VictoryChart
                height={270}
                theme={VictoryTheme.material}
                domainPadding={{ x: 20, y: 10 }}
                containerComponent={
                  <VictoryVoronoiContainer
                    labels={({ datum }) => `${datum.x}\nPts: ${datum.pts}`}
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
                    tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -22, padding: 15 },
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
                <VictoryBar data={standingsChartData} x="x" y="pts" style={{ data: { fill: "#39FF14", width: 10 } }} />
              </VictoryChart>
            ) : (
              <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Sin datos para la gráfica.</p>
            )}
          </div>

          <div className="card-pitch p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Diferencia de gol</h2>
              <ChartBarIcon className="h-6 w-6 text-geo-green" />
            </div>
            {standingsChartData.length ? (
              <VictoryChart height={270} domainPadding={{ x: 20, y: 12 }}>
                <VictoryAxis
                  style={{
                    axis: { stroke: "#3f3f46" },
                    tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -22, padding: 15 },
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
                <VictoryGroup offset={8} colorScale={["#22c55e", "#ef4444"]}>
                  <VictoryBar
                    data={standingsChartData.map((d) => ({ ...d, gdPositive: d.gd > 0 ? d.gd : 0 }))}
                    x="x"
                    y="gdPositive"
                    barWidth={8}
                  />
                  <VictoryBar
                    data={standingsChartData.map((d) => ({ ...d, gdNegative: d.gd < 0 ? Math.abs(d.gd) : 0 }))}
                    x="x"
                    y="gdNegative"
                    barWidth={8}
                  />
                </VictoryGroup>
              </VictoryChart>
            ) : (
              <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Sin datos para la gráfica.</p>
            )}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card-pitch p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Tabla pública</h2>
              <ChartBarIcon className="h-6 w-6 text-geo-green" />
            </div>
            <div className="mt-4 space-y-3">
              {standingRows.map((row, index) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl bg-[var(--geo-bg)] px-3 py-2">
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-bold text-geo-green">{index + 1}</span>
                    <div>
                      <p className="font-semibold">{row.team?.name || "Equipo"}</p>
                      <p className="text-xs text-[var(--geo-text-muted)]">{row.gamesPlayed} PJ · {row.goalDifference} DG</p>
                    </div>
                  </div>
                  <span className="font-geo text-lg text-geo-green">{row.points}</span>
                </div>
              ))}
              {!standingRows.length && <p className="text-sm text-[var(--geo-text-muted)]">Aún no hay posiciones cargadas.</p>}
            </div>
          </div>

          <div className="card-pitch p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Fixture y resultados</h2>
              <CalendarDaysIcon className="h-6 w-6 text-geo-green" />
            </div>
           <div className="mt-4 grid gap-4 xl:grid-cols-2 max-h-[600px] overflow-y-auto pr-2">
              {fixtureRounds.map(([roundName, matches]) => (
                <div key={roundName} className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                  <p className="font-semibold text-geo-green">{roundName}</p>
                  <ul className="mt-3 space-y-3 text-sm">
                    {matches.slice(0, 4).map((match) => (
                      <li key={match.id} className="rounded-xl bg-[var(--geo-bg)] px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="truncate">{match.homeTeam?.name || "Local"}</span>
                          <span className="text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">{match.played ? `${match.homeScore}-${match.awayScore}` : "vs"}</span>
                          <span className="truncate text-right">{match.awayTeam?.name || "Visitante"}</span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] uppercase tracking-[0.2em]">
                          <span className={match.played ? "text-emerald-400" : "text-amber-300"}>{match.played ? "Finalizado" : "Programado"}</span>
                          <span className="text-[var(--geo-text-muted)]">{match.date ? new Date(match.date).toLocaleDateString() : "Sin fecha"}</span>
                        </div>
                        <div className="mt-1 text-right">
                          <Link to={`/public/matches/${match.id}/detail`} className="text-[10px] font-bold uppercase tracking-wider text-geo-green hover:underline">
                            Ver detalle
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {!fixtureRounds.length && <p className="text-sm text-[var(--geo-text-muted)]">No hay fixture visible por ahora.</p>}
            </div>
          </div>
        </section>

        {/* 👇 2. AQU INTEGRAMOS LA TABLA DE GOLEADORES */}
        <section className="mt-8">
          <div className="card-pitch p-5 lg:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-geo text-2xl tracking-wide">Top 10 Goleadores</h2>
              <ChartBarIcon className="h-6 w-6 text-geo-green" />
            </div>
            <TopScorersTable leagueId={parsedLeagueId} />
          </div>
        </section>

        {/* 🌟 Jugador de la Jornada */}
        <section className="mt-6">
          <WeeklyAwardCard leagueId={parsedLeagueId} />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card-pitch p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Noticias y actividad</h2>
              <NewspaperIcon className="h-6 w-6 text-geo-green" />
            </div>
            <div className="mt-4 space-y-3">
              {latestNews.map((item) => (
                <article key={item.id} className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-geo-green">
                    <span>{item.type}</span>
                    <span>•</span>
                    <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="mt-2 font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{item.summary}</p>
                </article>
              ))}
              {!latestNews.length && <p className="text-sm text-[var(--geo-text-muted)]">No hay noticias públicas todavía.</p>}
            </div>
          </div>

          <div className="card-pitch p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Equipos</h2>
              <UserGroupIcon className="h-6 w-6 text-geo-green" />
            </div>
            <div className="mt-4 space-y-3">
              {teamPreview.map((team) => (
                <div key={team.id} className="rounded-2xl bg-[var(--geo-bg-card)] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-geo-green/30 bg-geo-black/80 font-geo text-sm text-geo-green">
                      {team.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold">{team.name}</p>
                      <p className="text-sm text-[var(--geo-text-muted)]">DT: {team.trainer?.name || "Sin entrenador"}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!teamPreview.length && <p className="text-sm text-[var(--geo-text-muted)]">No hay equipos registrados.</p>}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="card-pitch p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-geo text-xl tracking-wide">Campos y ubicaciones</h2>
              <MapPinIcon className="h-6 w-6 text-geo-green" />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {fieldPreview.map((field) => (
                <div key={field.id} className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                  <p className="font-semibold">{field.name}</p>
                  <p className="text-sm text-[var(--geo-text-muted)]">{field.address}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">
                    {field.city || field.country || "Ubicación pública"}
                  </p>
                </div>
              ))}
              {!fieldPreview.length && <p className="text-sm text-[var(--geo-text-muted)]">No hay campos públicos registrados.</p>}
            </div>
          </div>

          <div className="card-pitch p-5">
            <h2 className="font-geo text-xl tracking-wide">Temporadas</h2>
            <div className="mt-4 space-y-3">
              {data.seasons.slice(0, 4).map((season) => (
                <div key={season.id} className="rounded-2xl bg-[var(--geo-bg-card)] p-4">
                  <p className="font-semibold">{season.name}</p>
                  <p className="text-sm text-[var(--geo-text-muted)]">
                    {season.year} · {season.status}
                    {season.isCurrent ? " · actual" : ""}
                  </p>
                </div>
              ))}
              {!data.seasons.length && <p className="text-sm text-[var(--geo-text-muted)]">Sin temporadas registradas.</p>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}