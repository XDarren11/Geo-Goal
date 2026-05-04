import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/context/ThemeContext";
import { getPublicFixture, getPublicLeagues, getPublicNews, getPublicStandings } from "@/api/publicAPI";
import Logo from "@/components/Logo";
import MobileDownloadCard from "@/components/MobileDownloadCard";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  MoonIcon,
  SunIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup, VictoryLabel, VictoryPie, VictoryTheme, VictoryTooltip, VictoryVoronoiContainer } from "victory";

export default function PublicHomeView() {
  const { theme, toggleTheme } = useTheme();
  const { data: leagues, isLoading: leaguesLoading, isError: leaguesError } = useQuery({
    queryKey: ["public-leagues"],
    queryFn: getPublicLeagues,
  });
  const leagueList = Array.isArray(leagues) ? leagues : [];
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedLeagueId && leagueList.length) {
      setSelectedLeagueId(leagueList[0].id);
    }
  }, [leagueList, selectedLeagueId]);

  const selectedLeague = leagueList.find((league) => league.id === selectedLeagueId) ?? null;

  const { data: standings, isLoading: standingsLoading } = useQuery({
    queryKey: ["public-standings", selectedLeagueId],
    queryFn: () => getPublicStandings(selectedLeagueId as number),
    enabled: selectedLeagueId != null,
  });

  const { data: fixture, isLoading: fixtureLoading } = useQuery({
    queryKey: ["public-fixture", selectedLeagueId],
    queryFn: () => getPublicFixture(selectedLeagueId as number),
    enabled: selectedLeagueId != null,
  });

  const { data: publicNews, isLoading: newsLoading } = useQuery({
    queryKey: ["public-news", "home"],
    queryFn: () => getPublicNews(8),
  });

  const standingsChartData = (standings ?? [])
    .slice(0, 6)
    .map((row) => ({ x: row.team?.name || `T${row.team?.id ?? row.id}`, y: row.points }));

  const goalsChartData = (standings ?? [])
    .slice(0, 6)
    .map((row) => ({
      x: row.team?.name || `T${row.team?.id ?? row.id}`,
      gf: row.goalsFor,
      gc: row.goalsAgainst,
    }));

  const fixtureRoundVolumeData = Object.entries(fixture ?? {})
    .slice(0, 6)
    .map(([roundName, matches]) => ({ x: roundName, y: matches.length }));

  const fixturePlayedVsPending = Object.values(fixture ?? {}).flat().reduce(
    (acc, match) => {
      if (match.played) acc.played += 1;
      else acc.pending += 1;
      return acc;
    },
    { played: 0, pending: 0 }
  );

  return (
    <div className="min-h-screen bg-[var(--geo-bg)] text-[var(--geo-text)] pitch-stripes transition-colors duration-300">
      <header className="sticky top-0 z-30 border-b-4 border-geo-green bg-white/90 backdrop-blur dark:bg-geo-black/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
          <Link to="/public" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-geo-green bg-geo-black shadow-md">
              <Logo />
            </div>
            <div>
              <p className="font-geo text-2xl tracking-wider text-geo-black dark:text-geo-green">Geo-Goal</p>
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--geo-text-muted)]">Fútbol público y gestión</p>
            </div>
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
            <Link
              to="/auth/login"
              className="rounded-full border-2 border-geo-green px-4 py-2 text-sm font-semibold text-geo-black transition hover:bg-geo-green hover:text-white dark:text-geo-green dark:hover:text-geo-black"
            >
              Ingresar
            </Link>
            <Link
              to="/auth/register"
              className="rounded-full bg-geo-green px-4 py-2 text-sm font-semibold text-geo-black transition hover:brightness-110"
            >
              Registrar
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6 lg:py-12">
        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <span className="inline-flex rounded-full border border-geo-green/40 bg-geo-green/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-geo-green">
              Portal público de ligas
            </span>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-geo text-4xl leading-tight tracking-wide lg:text-6xl">
                Sigue la competencia, mira la tabla y revisa el fixture sin iniciar sesión.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-[var(--geo-text-muted)]">
                La información pública de Geo-Goal vive aquí: ligas, posiciones y partidos próximos en una sola portada. Si quieres administrar o participar, usa los accesos de arriba.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/auth/login"
                className="inline-flex items-center gap-2 rounded-full bg-geo-green px-5 py-3 font-semibold text-geo-black transition hover:brightness-110"
              >
                Ingresar <ArrowRightIcon className="h-4 w-4" />
              </Link>
              <Link
                to="/auth/register"
                className="inline-flex items-center gap-2 rounded-full border-2 border-geo-green px-5 py-3 font-semibold text-geo-green transition hover:bg-geo-green hover:text-geo-black"
              >
                Crear cuenta <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="card-pitch p-4">
                <ChartBarIcon className="h-7 w-7 text-geo-green" />
                <p className="mt-3 font-semibold">Tabla pública</p>
                <p className="text-sm text-[var(--geo-text-muted)]">Clasificación actual de las ligas activas.</p>
              </div>
              <div className="card-pitch p-4">
                <CalendarDaysIcon className="h-7 w-7 text-geo-green" />
                <p className="mt-3 font-semibold">Fixture visible</p>
                <p className="text-sm text-[var(--geo-text-muted)]">Jornadas y partidos próximos desde el inicio.</p>
              </div>
              <div className="card-pitch p-4">
                <UserGroupIcon className="h-7 w-7 text-geo-green" />
                <p className="mt-3 font-semibold">Equipos y campo</p>
                <p className="text-sm text-[var(--geo-text-muted)]">Consulta equipos, ubicaciones y datos públicos.</p>
              </div>
            </div>

            <MobileDownloadCard 
              apkUrl="/downloads/geo-goal-android.apk"
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="card-pitch p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-geo-green">Qué puedes ver aquí</p>
                <ul className="mt-3 space-y-2 text-sm text-[var(--geo-text-muted)]">
                  <li>• Tabla por puntos, partidos jugados y diferencia de gol.</li>
                  <li>• Fixture por jornadas con estado programado/finalizado.</li>
                  <li>• Detalle de liga con equipos, campos y temporadas.</li>
                  <li>• Vista rápida de rendimiento con gráficas públicas.</li>
                </ul>
              </div>

              <div className="card-pitch p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-geo-green">Si eres nuevo</p>
                <div className="mt-3 space-y-3 text-sm text-[var(--geo-text-muted)]">
                  <p>
                    1) Explora una liga y revisa su tabla actual.
                  </p>
                  <p>
                    2) Entra al detalle para ver jornadas y partidos.
                  </p>
                  <p>
                    3) Regístrate para administrar, entrenar, jugar o arbitrar.
                  </p>
                </div>
              </div>
            </div>

            <div className="card-pitch p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-geo-green">Geo-Goal público</p>
              <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
                Esta portada está pensada para consulta rápida: ranking, calendario y contexto competitivo sin necesidad de iniciar sesión.
                Si quieres interactuar con tu equipo o liga, usa <span className="font-semibold text-[var(--geo-text)]">Ingresar</span> o <span className="font-semibold text-[var(--geo-text)]">Crear cuenta</span>.
              </p>
            </div>
          </div>

          <div className="card-pitch overflow-hidden border border-geo-green/20 bg-[var(--geo-bg-card)] p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-[var(--geo-text-muted)]">Ligas públicas</p>
                <h2 className="font-geo text-2xl tracking-wide">Explora una liga</h2>
              </div>
              <TrophyIcon className="h-8 w-8 text-geo-green" />
            </div>

            <div className="mt-4">
              {leaguesLoading && <span className="text-sm text-[var(--geo-text-muted)]">Cargando ligas…</span>}
              {leaguesError && <span className="text-sm text-red-500">No se pudieron cargar ligas públicas.</span>}
              {!!leagueList.length && (
                <select
                  value={selectedLeagueId ?? ""}
                  onChange={(e) => setSelectedLeagueId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-geo-green/40 bg-[var(--geo-bg)] px-4 py-3 text-sm text-[var(--geo-text)] outline-none transition focus:border-geo-green"
                >
                  {leagueList.map((league) => (
                    <option key={league.id} value={league.id}>
                      {league.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-5 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg)] p-4">
              {selectedLeague ? (
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-geo-green/30 bg-geo-black/90">
                    <span className="font-geo text-xl text-geo-green">{selectedLeague.name.slice(0, 2).toUpperCase()}</span>
                  </div>
                  <div>
                    <h3 className="font-geo text-xl tracking-wide">{selectedLeague.name}</h3>
                    <p className="text-sm text-[var(--geo-text-muted)]">
                      {selectedLeague.description || "Liga pública disponible para consultar resultados y clasificación."}
                    </p>
                    <Link
                      to={`/public/leagues/${selectedLeague.id}`}
                      className="mt-3 inline-flex items-center gap-2 rounded-full border border-geo-green px-4 py-2 text-sm font-semibold text-geo-green transition hover:bg-geo-green hover:text-geo-black"
                    >
                      Ver liga completa <ArrowRightIcon className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="text-[var(--geo-text-muted)]">Selecciona una liga para ver su información pública.</p>
              )}
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-geo text-lg tracking-wide">Tabla destacada</h3>
                  <ChartBarIcon className="h-5 w-5 text-geo-green" />
                </div>
                {standingsLoading ? (
                  <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Cargando tabla…</p>
                ) : standings?.length ? (
                  <ul className="mt-4 space-y-3">
                    {standings.slice(0, 5).map((row, index) => (
                      <li key={row.id} className="flex items-center justify-between rounded-xl bg-[var(--geo-bg)] px-3 py-2">
                        <div className="flex items-center gap-3">
                          <span className="w-6 text-sm font-bold text-geo-green">{index + 1}</span>
                          <div>
                            <p className="font-semibold">{row.team?.name || "Equipo"}</p>
                            <p className="text-xs text-[var(--geo-text-muted)]">
                              {row.gamesPlayed} PJ · {row.goalDifference} DG
                            </p>
                          </div>
                        </div>
                        <span className="font-geo text-xl text-geo-green">{row.points}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Todavía no hay posiciones públicas para mostrar.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-geo text-lg tracking-wide">Fixture público</h3>
                  <CalendarDaysIcon className="h-5 w-5 text-geo-green" />
                </div>
                {fixtureLoading ? (
                  <p className="mt-4 text-sm text-[var(--geo-text-muted)]">Cargando fixture…</p>
                ) : fixture && Object.keys(fixture).length ? (
                  <div className="mt-4 space-y-4">
                    {Object.entries(fixture)
                      .slice(0, 2)
                      .map(([roundName, matches]) => (
                        <div key={roundName} className="rounded-xl bg-[var(--geo-bg)] p-3">
                          <p className="font-semibold text-geo-green">{roundName}</p>
                          <ul className="mt-2 space-y-2 text-sm text-[var(--geo-text-muted)]">
                            {matches.slice(0, 3).map((match) => (
                              <li key={match.id} className="flex items-center justify-between gap-3">
                                <span>{match.homeTeam?.name || "Local"}</span>
                                <span className="text-xs uppercase tracking-[0.2em]">vs</span>
                                <span className="text-right">{match.awayTeam?.name || "Visitante"}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-[var(--geo-text-muted)]">No hay partidos públicos cargados todavía.</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <h3 className="font-geo text-lg tracking-wide">Puntos por equipo (Top 6)</h3>
                {standingsChartData.length ? (
                  <VictoryChart
                    height={250}
                    theme={VictoryTheme.material}
                    domainPadding={{ x: 18, y: 10 }}
                    containerComponent={
                      <VictoryVoronoiContainer
                        labels={({ datum }) => `${datum.x}\nPts: ${datum.y}`}
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
                        tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -20, padding: 14 },
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
                    <VictoryBar data={standingsChartData} style={{ data: { fill: "#39FF14", width: 10 } }} />
                  </VictoryChart>
                ) : (
                  <p className="mt-3 text-sm text-[var(--geo-text-muted)]">Sin datos para la gráfica.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <h3 className="font-geo text-lg tracking-wide">Goles a favor vs en contra</h3>
                {goalsChartData.length ? (
                  <VictoryChart height={250} domainPadding={{ x: 16, y: 10 }}>
                    <VictoryAxis
                      style={{
                        axis: { stroke: "#3f3f46" },
                        tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -20, padding: 14 },
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
                  <p className="mt-3 text-sm text-[var(--geo-text-muted)]">Sin datos de goles para graficar.</p>
                )}
              </div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-2">
              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <h3 className="font-geo text-lg tracking-wide">Partidos por jornada</h3>
                {fixtureRoundVolumeData.length ? (
                  <VictoryChart height={240} domainPadding={{ x: 18, y: 10 }}>
                    <VictoryAxis
                      style={{
                        axis: { stroke: "#3f3f46" },
                        tickLabels: { fill: "#a1a1aa", fontSize: 9, angle: -15, padding: 12 },
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
                    <VictoryBar data={fixtureRoundVolumeData} style={{ data: { fill: "#22d3ee", width: 10 } }} />
                  </VictoryChart>
                ) : (
                  <p className="mt-3 text-sm text-[var(--geo-text-muted)]">Sin jornadas para mostrar.</p>
                )}
              </div>

              <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4">
                <h3 className="font-geo text-lg tracking-wide">Estado del fixture</h3>
                {fixturePlayedVsPending.played + fixturePlayedVsPending.pending > 0 ? (
                  <VictoryPie
                    height={240}
                    colorScale={["#39FF14", "#facc15"]}
                    data={[
                      { x: "Jugados", y: fixturePlayedVsPending.played },
                      { x: "Pendientes", y: fixturePlayedVsPending.pending },
                    ]}
                    innerRadius={55}
                    labelRadius={80}
                    style={{ labels: { fill: "#d4d4d8", fontSize: 10 } }}
                    labelComponent={<VictoryLabel />}
                  />
                ) : (
                  <p className="mt-3 text-sm text-[var(--geo-text-muted)]">Sin partidos para analizar.</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-geo-green/30 bg-geo-green/5 p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-geo-green">Exploración pública</p>
              <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
                Cada liga tiene su propia ficha pública con tabla, fixture, equipos, campos y actividad reciente.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-geo text-2xl tracking-wide">Noticias destacadas</h2>
            <span className="text-xs uppercase tracking-[0.2em] text-geo-green">Tiempo real</span>
          </div>
          {newsLoading ? (
            <p className="text-sm text-[var(--geo-text-muted)]">Cargando noticias…</p>
          ) : publicNews?.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {publicNews.map((item) => (
                <article key={item.id} className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] p-4">
                  <p className="text-xs text-[var(--geo-text-muted)]">{new Date(item.createdAt).toLocaleString()} · {item.leagueName || "Geo-Goal"}</p>
                  <p className="mt-1 font-bold text-[var(--geo-text)]">{item.title}</p>
                  <p className="mt-1 text-sm text-[var(--geo-text-muted)]">{item.summary}</p>
                  {item.matchId ? (
                    <Link className="mt-2 inline-block text-xs font-semibold text-geo-green hover:underline" to={`/public/matches/${item.matchId}/detail`}>
                      Ir al partido
                    </Link>
                  ) : item.leagueId ? (
                    <Link className="mt-2 inline-block text-xs font-semibold text-geo-green hover:underline" to={`/public/leagues/${item.leagueId}`}>
                      Ir a la liga
                    </Link>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--geo-text-muted)]">No hay noticias disponibles por ahora.</p>
          )}
        </section>
      </main>
    </div>
  );
}
