import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { getMyPlayerTeams, teamLogoUrl } from "@/api/teamAPI";
import { useMemo, useState } from "react";

export default function MyTeamsView() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: teams, isLoading, isError } = useQuery({
    queryKey: ["player-teams"],
    queryFn: getMyPlayerTeams,
  });

  const filteredTeams = useMemo(() => {
    const list = teams ?? [];
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return list;
    return list.filter((team) => {
      const name = team.name.toLowerCase();
      const league = team.league?.name?.toLowerCase() || "";
      const field = team.fieldAddress?.toLowerCase() || "";
      return name.includes(normalized) || league.includes(normalized) || field.includes(normalized);
    });
  }, [teams, searchTerm]);

  const withLeague = useMemo(
    () => (teams ?? []).filter((team) => Boolean(team.league?.name || team.leagueId)).length,
    [teams]
  );

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
    <div className="space-y-6 opacity-0 animate-in-up">
      <Link
        to="/dashboard"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>

      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Mis equipos</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">Equipos en los que estás inscrito como jugador.</p>
      </div>

      {!!teams?.length && (
        <>
          <div className="grid gap-4 opacity-0 animate-in-up stagger-2 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Equipos inscritos" value={teams.length} accent="text-geo-green" />
            <MetricCard label="En ligas" value={withLeague} accent="text-blue-300" />
            <MetricCard label="Sin liga" value={teams.length - withLeague} accent="text-amber-300" />
          </div>

          <div className="card-pitch flex flex-col gap-3 p-4 opacity-0 animate-in-up stagger-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-geo text-lg text-[var(--geo-text)]">Directorio de equipos</h2>
              <p className="text-xs text-[var(--geo-text-muted)]">
                {filteredTeams.length} de {teams.length} equipo(s) visibles
              </p>
            </div>
            <input
              className="input-pitch w-full lg:w-96"
              placeholder="Buscar por equipo, liga o cancha"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </>
      )}

      {!teams?.length ? (
        <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center opacity-0 animate-in-up stagger-4">
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
          {filteredTeams.map((team) => (
            <li
              key={team.id}
              className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5 opacity-0 animate-in-up transition-all hover:-translate-y-0.5 hover:border-geo-green/40 hover:shadow-[0_0_0_1px_rgba(57,255,20,0.2)]"
            >
              <Link to={`/teams/${team.id}`} className="group block">
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
                  <h2 className="truncate text-lg font-bold text-[var(--geo-text)] group-hover:text-geo-green">{team.name}</h2>
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
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                <span className="text-xs text-[var(--geo-text-muted)]">Equipo #{team.id}</span>
                <span className="rounded-full border border-geo-green/40 bg-geo-green/10 px-2.5 py-1 text-xs font-semibold text-geo-green">
                  Ver detalle
                </span>
              </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!!teams?.length && !filteredTeams.length && (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--geo-text-muted)]">
          No hay equipos que coincidan con tu búsqueda.
        </p>
      )}

      {!!teams?.length && (
        <div className="card-pitch p-4 opacity-0 animate-in-up stagger-4">
          <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Distribución de equipos</p>
          <div className="mt-3 space-y-3">
            {[
              { label: "Con liga", value: withLeague, color: "#60a5fa" },
              { label: "Sin liga", value: teams.length - withLeague, color: "#facc15" },
            ].map((item) => {
              const pct = teams.length ? Math.round((item.value / teams.length) * 100) : 0;
              return (
                <div key={item.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--geo-text-muted)]">{item.label}</span>
                    <span className="font-semibold text-[var(--geo-text)]">{item.value} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card-pitch p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-geo ${accent}`}>{value}</p>
    </div>
  );
}
