import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getActiveLeagues } from "@/api/teamAPI";
import { TrophyIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export default function CoachActiveLeaguesView() {
  const { data: leagues, isLoading, isError } = useQuery({
    queryKey: ["coachActiveLeagues"],
    queryFn: getActiveLeagues,
  });

  const getTeamLogoUrl = (logoUrl: string | null, teamName: string) => {
    if (logoUrl) {
      return `http://localhost:4000/uploads/${logoUrl}`;
    }
    const initials = teamName.substring(0, 2).toUpperCase();
    return `https://ui-avatars.com/api/?name=${initials}&background=27272a&color=fff&rounded=true&bold=true`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <p className="text-[var(--geo-text-muted)] animate-pulse">Cargando tus ligas activas…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center text-red-600 dark:text-red-400">
        Hubo un error al cargar tus ligas. Por favor, intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
      >
        ← Volver al Inicio
      </Link>
      
      <div className="mt-4 flex items-center gap-3">
        <TrophyIcon className="h-8 w-8 text-geo-green" />
        <h1 className="text-3xl font-black text-[var(--geo-text)]">
          Mis Ligas Activas
        </h1>
      </div>
      
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Aquí verás los torneos donde tus equipos están compitiendo actualmente.
      </p>

      {!leagues || leagues.length === 0 ? (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center shadow-sm">
          <UserGroupIcon className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
          <p className="text-[var(--geo-text-muted)]">
            Tus equipos aún no están participando en ninguna liga.
          </p>
          <p className="text-sm mt-2 text-zinc-500">
            Un administrador debe invitar a tus equipos a un torneo.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league: any) => (
            <div 
              key={league.id} 
              className="flex flex-col rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5 shadow-sm transition-all hover:border-geo-green/50 hover:shadow-md"
            >
              {/* Encabezado de la Liga */}
              <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-black text-geo-green line-clamp-1" title={league.name}>
                    {league.name}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider font-semibold">
                    Liga Oficial
                  </p>
                </div>
                <TrophyIcon className="h-6 w-6 text-zinc-600" />
              </div>

              {/* Descripción de la liga */}
              {league.description && (
                <p className="mt-4 text-sm text-[var(--geo-text-muted)] line-clamp-2 min-h-[40px]">
                  {league.description}
                </p>
              )}

              {/* Sección de Equipos Participantes de este Coach */}
              <div className="mt-5 flex-1 rounded-lg bg-zinc-900/50 p-4 border border-zinc-800">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">
                  Tus Equipos en competencia
                </p>
                
                {league.teams && league.teams.length > 0 ? (
                  <ul className="space-y-3">
                    {league.teams.map((team: any) => (
                      <li key={team.id} className="flex items-center gap-3">
                        <img 
                          src={getTeamLogoUrl(team.logoUrl, team.name)} 
                          alt={`Logo de ${team.name}`}
                          className="h-8 w-8 rounded-full object-cover border border-zinc-700 bg-zinc-800"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${team.name.substring(0, 2)}&background=27272a&color=fff&rounded=true`;
                          }}
                        />
                        <span className="font-semibold text-[var(--geo-text)] text-sm">
                          {team.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500 italic">No hay equipos listados.</p>
                )}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                 <Link
                  to={`/league/${league.id}/standings`}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 py-2 text-center text-sm font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
                 >
                   Tabla
                 </Link>
                 <Link
                  to={`/leagues/${league.id}/results`}
                  className="rounded-lg border border-geo-green/30 bg-geo-green/10 py-2 text-center text-sm font-bold text-geo-green hover:bg-geo-green/20 transition-colors"
                 >
                   Resultados
                 </Link>
              </div>

              {/* Botón(es) de Estadísticas Dinámico */}
              <div className="mt-3">
                {league.teams?.length === 1 ? (
                  <Link
                    to={`/leagues/${league.id}/teams/${league.teams[0].id}/dashboard`}
                    className="block w-full rounded-lg border border-blue-500/30 bg-blue-500/10 py-2 text-center text-sm font-bold text-blue-400 hover:bg-blue-500/20 transition-colors"
                  >
                    Estadísticas del equipo
                  </Link>
                ) : league.teams?.length > 1 ? (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                      Ver estadísticas por equipo:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {league.teams.map((team: any) => (
                        <Link
                          key={team.id}
                          to={`/leagues/${league.id}/teams/${team.id}/dashboard`}
                          className="truncate rounded border border-blue-500/30 bg-blue-500/5 py-1.5 px-2 text-center text-xs font-bold text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title={`Estadísticas de ${team.name}`}
                        >
                          {team.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}