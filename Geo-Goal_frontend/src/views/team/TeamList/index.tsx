import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyTeams } from "@/api/teamAPI";
import { teamLogoUrl } from "@/api/teamAPI";
import { PlusCircleIcon, UserGroupIcon } from "@heroicons/react/24/outline";

export default function TeamListView() {
  const { data: teams, isLoading, isError } = useQuery({
    queryKey: ["teams"],
    queryFn: getMyTeams,
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
        No se pudieron cargar los equipos.
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Mis equipos</h1>
        <Link
          to="/teams/new"
          className="btn-pitch inline-flex items-center gap-2 px-5 py-2.5"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Crear equipo
        </Link>
      </div>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Gestiona tus equipos, jugadores y resultados.
      </p>

      {!teams?.length ? (
        <div className="card-pitch mt-10 p-10 text-center opacity-0 animate-in-up stagger-2">
          <UserGroupIcon className="mx-auto h-14 w-14 text-geo-green" />
          <p className="mt-5 font-geo text-xl text-[var(--geo-text-muted)]">Aún no tienes equipos.</p>
          <Link
            to="/teams/new"
            className="btn-pitch mt-5 inline-block px-6 py-2.5"
          >
            Crear primer equipo
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team, i) => {
            const stagger = ['stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8', 'stagger-9'][i] || 'stagger-2';
            return (
            <li key={team.id} className={`opacity-0 animate-in-up ${stagger}`}>
              <Link
                to={`/teams/${team.id}`}
                className="card-pitch flex items-center gap-4 p-5"
              >
                {team.logoUrl ? (
                  <img
                    src={teamLogoUrl(team.logoUrl)}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-geo-green/20">
                    <UserGroupIcon className="h-7 w-7 text-geo-green" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="font-geo text-xl tracking-wide text-geo-green">{team.name}</h2>
                  {team.fieldAddress && (
                    <p className="truncate text-sm text-[var(--geo-text-muted)]">
                      {team.fieldAddress}
                    </p>
                  )}
                </div>
                <span className="text-geo-green">→</span>
              </Link>
            </li>
          );
          })}
        </ul>
      )}
    </div>
  );
}
