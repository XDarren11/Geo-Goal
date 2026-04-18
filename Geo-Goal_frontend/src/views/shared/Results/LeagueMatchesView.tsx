import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagueMatches, getMatchAnalytics } from "@/api/leagueAPI";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import type { MatchAnalyticsResponse } from "@/types";

export default function LeagueMatchesView() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const id = Number(leagueId);

  // Consumimos el endpoint de los partidos
  const { data: matchesData, isLoading, isError } = useQuery({
    queryKey: ["matches", id],
    queryFn: () => getLeagueMatches(id),
    enabled: !!id,
    retry: false, // Evitamos que reintente infinitamente si da error 401 (no autorizado)
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--geo-text-muted)]">Cargando jornadas y resultados…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-6 text-center text-red-600 dark:text-red-400">
        <p className="font-bold">No se pudieron cargar los resultados.</p>
        <p className="mt-2 text-sm">Asegúrate de haber iniciado sesión, ya que esta información es privada para los participantes de la liga.</p>
      </div>
    );
  }

  const isGrouped = matchesData && !Array.isArray(matchesData) && typeof matchesData === 'object';
  const isEmpty = !matchesData || (isGrouped ? Object.keys(matchesData).length === 0 : matchesData.length === 0);

  return (
    <div className="opacity-0 animate-in-up">
      <Link
        to="/results" 
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
      >
        ← Volver a ligas
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <CalendarDaysIcon className="h-8 w-8 text-geo-green" />
        <h1 className="text-3xl font-black text-[var(--geo-text)]">Jornadas y Resultados</h1>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm">
        {isEmpty ? (
          <p className="text-center text-[var(--geo-text-muted)] py-8">
            El calendario de esta liga aún no ha sido generado por el administrador.
          </p>
        ) : isGrouped ? (
          <div className="space-y-10">
            {Object.entries(matchesData).map(([round, matches]: [string, any]) => (
              <div key={round}>
                <h3 className="mb-4 font-bold text-xl text-geo-green border-b border-[var(--geo-border)] pb-2">
                  {round}
                </h3>
                {/* Cuadrícula responsiva para los partidos de esta jornada */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {matches.map((m: any) => (
                    <MatchCard key={m.id} match={m} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Si el backend devuelve solo una lista plana de partidos sin separar por jornadas
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
            {matchesData.map((m: any) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


function MatchCard({ match }: { match: any }) {  
  const [showAnalytics, setShowAnalytics] = useState(false);

  const { data: analytics, isLoading: analyticsLoading } = useQuery<MatchAnalyticsResponse>({
    queryKey: ["match-analytics", match.id],
    queryFn: () => getMatchAnalytics(Number(match.id)),
    enabled: showAnalytics && Boolean(match.played),
    staleTime: 30_000,
  });

  const playerNameById = useMemo(() => {
    const map = new Map<number, string>();
    const rows = analytics?.playerStats ?? [];
    rows.forEach((row) => {
      if (!map.has(row.playerId)) {
        map.set(row.playerId, row.player?.name || `Jugador ${row.playerId}`);
      }
    });
    return map;
  }, [analytics?.playerStats]);

  const topHeatCells = useMemo(() => {
    const items = analytics?.heatmaps ?? [];
    const merged: Record<string, number> = {};
    items.forEach((entry) => {
      Object.entries(entry.cells || {}).forEach(([cell, value]) => {
        merged[cell] = (merged[cell] ?? 0) + value;
      });
    });
    return Object.entries(merged)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [analytics?.heatmaps]);

  const getLogoUrl = (team: any) => {
    if (team?.logoUrl) {
      return `http://localhost:4000/uploads/${team.logoUrl}`;
    }
    const initials = team?.name ? team.name.substring(0, 2).toUpperCase() : 'EQ';
    return `https://ui-avatars.com/api/?name=${initials}&background=27272a&color=fff&rounded=true&bold=true`;
  };

  const homeLogo = getLogoUrl(match.homeTeam);
  const awayLogo = getLogoUrl(match.awayTeam);

  return (
    <div className="flex flex-col justify-center rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] p-5 shadow-sm transition-all hover:border-zinc-500 hover:shadow-md">
      <div className="flex items-center justify-between gap-3">
        
        {/* === Equipo Local === */}
        <div className="flex flex-1 items-center gap-3">
          <img
            src={homeLogo}
            alt={`Escudo de ${match.homeTeam?.name ?? 'Local'}`}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-zinc-700 bg-zinc-800 shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=LC&background=27272a&color=fff&rounded=true`;
            }}
          />
          <span className="font-bold text-[var(--geo-text)] line-clamp-2 text-sm">
            {match.homeTeam?.name ?? "Local"}
          </span>
        </div>

        {/* === Marcador Central === */}
        <div className="mx-2 flex flex-col items-center justify-center min-w-[120px] flex-shrink-0 text-center">
          {match.played ? (
            <div className="flex flex-col items-center">
              <div className="rounded bg-zinc-800 px-3 py-1.5 font-mono text-xl font-black text-geo-green tracking-wide shadow-inner border border-zinc-700 whitespace-nowrap">
                {/* Lógica para mostrar los penales si existen */}
                {match.homePenaltiesScore != null && match.awayPenaltiesScore != null ? (
                  <span>
                    {match.homeScore} <span className="text-zinc-400 text-sm">({match.homePenaltiesScore})</span> - <span className="text-zinc-400 text-sm">({match.awayPenaltiesScore})</span> {match.awayScore}
                  </span>
                ) : (
                  <span>{match.homeScore} - {match.awayScore}</span>
                )}
              </div>
              {/* Le agregamos una pequeña etiqueta abajo para que se entienda */}
              {match.homePenaltiesScore != null && (
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
                  Penales
                </span>
              )}
            </div>
          ) : (
            <div className="rounded-full bg-zinc-800/50 border border-zinc-700/50 px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
              Pendiente
            </div>
          )}
        </div>

        {/* === Equipo Visitante === */}
        <div className="flex flex-1 items-center gap-3 flex-row-reverse text-right">
          <img
            src={awayLogo}
            alt={`Escudo de ${match.awayTeam?.name ?? 'Visitante'}`}
            className="h-10 w-10 flex-shrink-0 rounded-full object-cover border border-zinc-700 bg-zinc-800 shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=VS&background=27272a&color=fff&rounded=true`;
            }}
          />
          <span className="font-bold text-[var(--geo-text)] line-clamp-2 text-sm">
            {match.awayTeam?.name ?? "Visitante"}
          </span>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <span className="mr-auto text-[11px] text-[var(--geo-text-muted)]">
          {match.date ? new Date(match.date).toLocaleString() : "Sin programar"}
        </span>
        {match.played ? (
          <button
            type="button"
            onClick={() => setShowAnalytics((prev) => !prev)}
            className="mr-4 text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-geo-green"
          >
            {showAnalytics ? "Ocultar analytics" : "Ver analytics"}
          </button>
        ) : null}
        <Link
          to={`/public/matches/${match.id}/detail`}
          className="text-xs font-bold uppercase tracking-wider text-geo-green hover:underline"
        >
          Ver detalle del partido
        </Link>
      </div>

      {showAnalytics ? (
        <div className="mt-4 rounded-lg border border-white/10 bg-zinc-900/30 p-3">
          {analyticsLoading ? (
            <p className="text-xs text-[var(--geo-text-muted)]">Cargando analytics...</p>
          ) : analytics ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-zinc-900/60 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Jugadores</p>
                  <p className="text-lg font-black text-geo-green">{analytics.summary.totalPlayersWithStats}</p>
                </div>
                <div className="rounded-md bg-zinc-900/60 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Pases conectados</p>
                  <p className="text-lg font-black text-geo-green">{analytics.summary.totalPassEdges}</p>
                </div>
                <div className="rounded-md bg-zinc-900/60 p-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-500">Eventos espaciales</p>
                  <p className="text-lg font-black text-geo-green">{analytics.summary.totalSpatialEvents}</p>
                </div>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
                <div className="lg:col-span-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Top jugadores</p>
                  <ul className="space-y-1 text-xs">
                    {(analytics.topPlayers || []).slice(0, 5).map((p) => (
                      <li key={p.id} className="rounded-md bg-zinc-900/50 px-2 py-1 text-zinc-200">
                        {p.player?.name || `Jugador ${p.playerId}`} · ⭐ {p.rating.toFixed(2)} · G/A {p.goals}/{p.assists}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Red de pases</p>
                  <ul className="space-y-1 text-xs">
                    {(analytics.passNetwork || []).slice(0, 5).map((edge, idx) => (
                      <li key={`${edge.teamId}-${edge.fromPlayerId}-${edge.toPlayerId}-${idx}`} className="rounded-md bg-zinc-900/50 px-2 py-1 text-zinc-200">
                        {playerNameById.get(edge.fromPlayerId) || `#${edge.fromPlayerId}`} → {playerNameById.get(edge.toPlayerId) || `#${edge.toPlayerId}`} ({edge.count})
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-1">
                  <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Heatmap (zonas)</p>
                  <ul className="space-y-1 text-xs">
                    {topHeatCells.length ? (
                      topHeatCells.map(([cell, count]) => (
                        <li key={cell} className="rounded-md bg-zinc-900/50 px-2 py-1 text-zinc-200">
                          Zona {cell.replace(":", "-")} · {count} acciones
                        </li>
                      ))
                    ) : (
                      <li className="rounded-md bg-zinc-900/50 px-2 py-1 text-zinc-400">Sin datos de calor</li>
                    )}
                  </ul>
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-widest text-zinc-400">Resumen por equipo</p>
                <ul className="grid gap-2 md:grid-cols-2 text-xs">
                  {(analytics.teamStats || []).map((teamRow) => (
                    <li key={teamRow.id} className="rounded-md bg-zinc-900/50 px-2 py-2 text-zinc-200">
                      <p className="font-semibold text-geo-green">{teamRow.team?.name || `Equipo ${teamRow.teamId}`}</p>
                      <p>Goles: {teamRow.goals} · Tiros: {teamRow.shots} · A puerta: {teamRow.shotsOnTarget}</p>
                      <p>Pases: {teamRow.passesCompleted}/{teamRow.passes}</p>
                      <p>Rating prom: {teamRow.avgRating.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">No hay analytics disponibles para este partido.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}