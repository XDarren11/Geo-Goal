import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { getMyPlayerTeams, teamLogoUrl } from "@/api/teamAPI";

export default function MyTeamsView() {
  const { data: teams, isLoading, isError } = useQuery({
    queryKey: ["player-teams"],
    queryFn: getMyPlayerTeams,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 rounded-full border-2 border-geo-green border-t-transparent animate-spin" />
        <p className="font-geo text-xl text-[var(--geo-text-muted)]">Cargando equipos…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-pitch border-red-500/30 bg-red-50 p-5 text-red-600 dark:bg-red-900/20 dark:text-red-400">
        No se pudieron cargar tus equipos.
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/dashboard"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Mis equipos
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Equipos en los que estás inscrito como jugador.
      </p>

      {!teams?.length ? (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
          <UserGroupIcon className="mx-auto h-12 w-12 text-geo-green" />
          <p className="mt-4 text-[var(--geo-text-muted)]">
            Primero únete a un equipo con el código que te dio tu entrenador.
          </p>
          <Link
            to="/teams/join"
            className="mt-4 inline-block rounded-lg bg-geo-green px-6 py-2 font-bold text-geo-black hover:bg-geo-green-hover"
          >
            Unirse a un equipo
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <li
              key={team.id}
              className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5"
            >
              <div className="flex items-center gap-4">
                {team.logoUrl ? (
                  <img
                    src={teamLogoUrl(team.logoUrl)}
                    alt=""
                    className="h-12 w-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-geo-green/20">
                    <UserGroupIcon className="h-6 w-6 text-geo-green" />
                  </div>
                )}

                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-[var(--geo-text)]">{team.name}</h2>
                  {team.fieldAddress && (
                    <p className="truncate text-sm text-[var(--geo-text-muted)]">{team.fieldAddress}</p>
                  )}
                  {team.league?.name ? (
                    <p className="mt-1 text-xs text-[var(--geo-text-muted)]">
                      Liga: {team.league.name}
                    </p>
                  ) : team.leagueId ? (
                    <p className="mt-1 text-xs text-[var(--geo-text-muted)]">
                      Liga: {team.leagueId}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
