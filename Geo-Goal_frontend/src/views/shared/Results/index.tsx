import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import { getActiveLeagues } from "@/api/teamAPI"; 
import { CalendarDaysIcon, TrophyIcon } from "@heroicons/react/24/outline";

export default function ResultsView() {

  const { data: user } = useAuth();
  const role = (user?.role as Role)

  const { data: leagues, isLoading, isError } = useQuery({
    queryKey: ["leagues", "results", role], 
    queryFn: () => {
      if (role === "coach") {
        return getActiveLeagues();
      }
      return getLeagues();
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--geo-text-muted)] animate-pulse">Cargando torneos…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-red-600 dark:text-red-400 text-center">
        No se pudieron cargar los torneos. Verifica tu conexión o tus permisos.
      </div>
    );
  }

  return (
    <div className="opacity-0 animate-in-up">
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
      >
        ← Inicio
      </Link>
      
      <div className="mt-4">
        <h1 className="text-3xl font-black text-[var(--geo-text)]">
          Resultados de las jornadas
        </h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          {role === "coach" 
            ? "Selecciona uno de tus torneos activos para ver los marcadores." 
            : "Selecciona una liga para ver el calendario completo y los marcadores de los partidos."}
        </p>
      </div>

      {!leagues?.length ? (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center opacity-0 animate-in-up stagger-2 shadow-sm">
          <TrophyIcon className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-4 text-[var(--geo-text-muted)]">
            {role === "coach" 
              ? "Tus equipos aún no participan en ningún torneo." 
              : "Aún no hay ligas disponibles."}
          </p>
        </div>
      ) : (
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {leagues.map((league: any, i: number) => {
            const stagger = ['stagger-2', 'stagger-3', 'stagger-4', 'stagger-5', 'stagger-6', 'stagger-7', 'stagger-8', 'stagger-9'][i] || 'stagger-2';
            return (
              <li key={league.id} className={`opacity-0 animate-in-up ${stagger} relative group`}>
                <Link to={`/leagues/${league.id}/results`} className="card-pitch block p-5 h-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] hover:border-geo-green/50 hover:shadow-md transition-all">
                  <div className="flex items-center justify-between">
                    <h2 className="font-geo text-xl tracking-wide text-geo-green pr-4 line-clamp-1">
                      {league.name}
                    </h2>
                    <CalendarDaysIcon className="h-6 w-6 text-zinc-600 transition-colors group-hover:text-geo-green flex-shrink-0" />
                  </div>
                  
                  {league.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--geo-text-muted)] min-h-[40px]">
                      {league.description}
                    </p>
                  )}
                  
                  <span className="mt-4 inline-block font-bold text-sm text-geo-green tracking-wide">
                    Ver jornadas y resultados →
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