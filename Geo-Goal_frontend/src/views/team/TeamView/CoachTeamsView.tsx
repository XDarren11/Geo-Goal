import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { getActiveLeagues } from "@/api/teamAPI";
import { TeamAvatar } from "@/components/Avatar/TeamAvatar";

// Interfaz para el Equipo
interface Team {
  id: number;
  name: string;
  logoUrl?: string;
}

type CoachLeague = {
  id: number;
  name: string;
  teams: Team[];
};

export default function CoachTeamsView() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leagues = [], isLoading, isError } = useQuery<CoachLeague[]>({
    queryKey: ["coach-active-leagues"],
    queryFn: getActiveLeagues,
  });

  const totalTeams = useMemo(
    () => leagues.reduce((acc, league) => acc + (league.teams?.length ?? 0), 0),
    [leagues]
  );

  const filteredLeagues = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return leagues;

    return leagues
      .map((league) => ({
        ...league,
        teams: (league.teams ?? []).filter(
          (team) =>
            team.name.toLowerCase().includes(normalized) ||
            league.name.toLowerCase().includes(normalized)
        ),
      }))
      .filter((league) => league.teams.length > 0 || league.name.toLowerCase().includes(normalized));
  }, [leagues, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-geo-green border-t-transparent" />
        <p className="font-geo text-xl text-[var(--geo-text-muted)]">Cargando tus equipos...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card-pitch border-red-500/30 bg-red-500/10 p-5 text-red-400">
        No se pudieron cargar tus ligas activas.
      </div>
    );
  }

  return (
    <div className="space-y-6 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Mis equipos y ligas</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Selecciona uno de tus equipos para entrar a su panel y seguimiento de temporada.
        </p>
      </div>

      {!!leagues.length && (
        <>
          <div className="grid gap-4 opacity-0 animate-in-up stagger-2 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Ligas activas" value={leagues.length} accent="text-geo-green" />
            <MetricCard label="Equipos totales" value={totalTeams} accent="text-blue-300" />
            <MetricCard
              label="Promedio equipos/liga"
              value={leagues.length ? Number((totalTeams / leagues.length).toFixed(1)) : 0}
              accent="text-amber-300"
            />
          </div>

          <div className="card-pitch flex flex-col gap-3 p-4 opacity-0 animate-in-up stagger-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-geo text-lg text-[var(--geo-text)]">Directorio del coach</h2>
              <p className="text-xs text-[var(--geo-text-muted)]">
                {filteredLeagues.length} de {leagues.length} liga(s) visible(s)
              </p>
            </div>
            <input
              className="input-pitch w-full lg:w-96"
              placeholder="Buscar por liga o equipo"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </>
      )}

      {!leagues.length ? (
        <div className="card-pitch p-8 text-center opacity-0 animate-in-up stagger-4">
          <p className="text-[var(--geo-text-muted)]">
            No tienes equipos inscritos en ninguna liga actualmente.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredLeagues.map((league, idx) => (
            <div
              key={league.id}
              className="card-pitch flex flex-col p-5 opacity-0 animate-in-up transition-all hover:border-geo-green/40 hover:shadow-[0_0_0_1px_rgba(57,255,20,0.2)]"
              style={{ animationDelay: `${Math.min(idx, 8) * 80}ms` }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div className="pr-4">
                  <h2 className="font-geo text-xl uppercase tracking-wide text-geo-green">{league.name}</h2>
                  <p className="mt-1 text-xs text-[var(--geo-text-muted)]">Temporada activa</p>
                </div>
                <ChartBarIcon className="h-5 w-5 shrink-0 text-[var(--geo-text-muted)]" />
              </div>

              <div className="mt-auto border-t border-white/10 pt-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">
                  Tus equipos
                </p>

                {league.teams.length ? (
                  <div className="space-y-2">
                    {league.teams.map((team) => (
                      <Link
                        key={team.id}
                        to={`/teams/${team.id}`}
                        className="group flex items-center justify-between rounded-xl border border-transparent bg-white/[0.02] p-3 transition-all hover:border-geo-green/30 hover:bg-geo-green/10"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="scale-90">
                            <TeamAvatar name={team.name} logoUrl={team.logoUrl} id={team.id} />
                          </div>
                          <span className="truncate font-semibold text-[var(--geo-text)]">{team.name}</span>
                        </div>
                        <span className="text-xs font-bold text-geo-green transition-transform group-hover:translate-x-1">
                          Ver →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--geo-text-muted)]">
                    Esta liga no tiene equipos asignados para tu perfil.
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!!leagues.length && !filteredLeagues.length && (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--geo-text-muted)]">
          No hay ligas o equipos que coincidan con la búsqueda.
        </p>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="card-pitch p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-geo ${accent}`}>{value}</p>
    </div>
  );
}