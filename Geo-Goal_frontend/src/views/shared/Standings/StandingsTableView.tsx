import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getStandings } from "@/api/leagueAPI";
import { ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";

export default function StandingsTableView() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const id = Number(leagueId);

  const { data: standings, isLoading, isError } = useQuery({
    queryKey: ["standings", id],
    queryFn: () => getStandings(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--geo-text-muted)]">Cargando tabla de posiciones…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
        Hubo un error al cargar la tabla de posiciones.
      </div>
    );
  }

  const teamsList = Array.isArray(standings) ? standings : standings?.teams || [];
  return (
    <div className="opacity-0 animate-in-up">
      <Link
        to="/standings"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Volver a ligas
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ChartBarIcon className="h-8 w-8 text-geo-green" />
        <h1 className="text-3xl font-black text-[var(--geo-text)]">Clasificación</h1>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] overflow-hidden shadow-sm">
        {teamsList.length === 0 ? (
          <div className="p-8 text-center">
            <TrophyIcon className="mx-auto h-12 w-12 text-zinc-600" />
            <p className="mt-4 text-[var(--geo-text-muted)]">
              No hay equipos ni estadísticas para mostrar en esta liga aún.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-[var(--geo-text)]">
              <thead className="bg-zinc-800/50 text-xs uppercase text-[var(--geo-text-muted)] border-b border-[var(--geo-border)]">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold">Pos</th>
                  <th scope="col" className="px-6 py-4 font-semibold">Equipo</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold">PJ</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-green-500">G</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-yellow-500">E</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-red-500">P</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-green-500">GA</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-red-500">GC</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-yellow-500">DF</th>
                  <th scope="col" className="px-4 py-4 text-center font-semibold text-yellow-500">VP</th>
                  <th scope="col" className="px-6 py-4 text-center font-bold text-geo-green">PTS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--geo-border)]">
                {teamsList.map((team: any, index: number) => (
                  <tr 
                    key={team.id} 
                    className="transition-colors hover:bg-zinc-800/30"
                  >
                    {/* Posición */}
                    <td className="whitespace-nowrap px-6 py-4 font-medium">
                      {index === 0 ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-geo-green text-xs font-bold text-black">
                          1
                        </span>
                      ) : (
                        <span className="text-zinc-500">{index + 1}</span>
                      )}
                    </td>
                    
                    {/* Nombre del Equipo */}
                    <td className="whitespace-nowrap px-6 py-4 font-bold">
                      {team.team.name}
                    </td>
                    
                    {/* Estadísticas */}
                    <td className="whitespace-nowrap px-4 py-4 text-center text-zinc-400">{team.gamesPlayed || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.wins || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.draws || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.losses || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.goalsFor || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.goalsAgainst || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.goalDifference || 0}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-center">{team.penaltyWins || 0}</td>
                    {/* Puntos (Resaltados) */}
                    <td className="whitespace-nowrap px-6 py-4 text-center text-lg font-black text-geo-green">
                      {team.points || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}