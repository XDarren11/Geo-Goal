import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagueMatches } from "@/api/leagueAPI";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

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
    </div>
  );
}