import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { PlusCircleIcon, TrophyIcon } from "@heroicons/react/24/outline";

export default function LeagueListView() {
  const { data: leagues, isLoading, isError } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--geo-text-muted)]">Cargando ligas…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-600 dark:text-red-400">
        No se pudieron cargar las ligas. Verifica tu conexión.
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-in-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Mis ligas</h1>
        <Link
          to="/leagues/new"
          className="btn-pitch inline-flex items-center gap-2 px-5 py-2.5"
        >
          <PlusCircleIcon className="h-5 w-5" />
          Crear liga
        </Link>
      </div>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Administra tus ligas, equipos, fixture y logo.
      </p>

      {!leagues?.length ? (
        <div className="card-pitch mt-10 p-10 text-center opacity-0 animate-in-up stagger-2">
          <TrophyIcon className="mx-auto h-14 w-14 text-geo-green" />
          <p className="mt-5 font-geo text-xl text-[var(--geo-text-muted)]">Aún no tienes ligas.</p>
          <Link
            to="/leagues/new"
            className="btn-pitch mt-5 inline-block px-6 py-2.5"
          >
            Crear primera liga
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league, i) => {
            const stagger = ['stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8', 'stagger-9'][i] || 'stagger-2';
            return (
            <li key={league.id} className={`opacity-0 animate-in-up ${stagger}`}>
              <Link
                to={`/leagues/${league.id}`}
                className="card-pitch block p-5"
              >
                <h2 className="font-geo text-xl tracking-wide text-geo-green">{league.name}</h2>
                {league.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--geo-text-muted)]">
                    {league.description}
                  </p>
                )}
                <span className="mt-3 inline-block font-geo text-geo-green tracking-wide">
                  Ver detalle →
                </span>
              </Link>
            </li>
          );
          })}
        </ul>
      )}
    </div>
  );
}
