import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { ChartBarIcon, TrophyIcon } from "@heroicons/react/24/outline";

export default function StandingsView() {
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
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      
      <div className="mt-4">
        <h1 className="text-3xl font-black text-[var(--geo-text)]">
          Tabla de posiciones
        </h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Selecciona una liga para ver su clasificación actual.
        </p>
      </div>

      {!leagues?.length ? (
        // Estado vacío si no hay ligas
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center opacity-0 animate-in-up stagger-2">
          <TrophyIcon className="mx-auto h-12 w-12 text-geo-green" />
          <p className="mt-4 text-[var(--geo-text-muted)]">
            Aún no tienes ligas creadas.
          </p>
        </div>
      ) : (
        // Cuadrícula de ligas
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league, i) => {
            const stagger = ['stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8', 'stagger-9'][i] || 'stagger-2';
            return (
              <li key={league.id} className={`opacity-0 animate-in-up ${stagger} relative group`}>
                
                <Link to={`/league/${league.id}/standings`} className="card-pitch block p-5 h-full">
                  <div className="flex items-center justify-between">
                    <h2 className="font-geo text-xl tracking-wide text-geo-green pr-4">
                      {league.name}
                    </h2>
                    <ChartBarIcon className="h-6 w-6 text-zinc-600 transition-colors group-hover:text-geo-green" />
                  </div>
                  
                  {league.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--geo-text-muted)]">
                      {league.description}
                    </p>
                  )}
                  
                  <span className="mt-4 inline-block font-geo text-geo-green tracking-wide">
                    Ver tabla →
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