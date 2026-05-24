import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeagues, getTeamsLeague } from "@/api/leagueAPI";
import { createFriendlyMatch, deleteFriendlyMatch, listFriendlyMatches } from "@/api/adminAPI";
import { toast } from "react-toastify";

interface TeamOption {
  id: number;
  name: string;
  leagueName: string;
}

export default function FriendlyMatchManagementView() {
  const queryClient = useQueryClient();
  const [homeTeamId, setHomeTeamId] = useState<number | "">("");
  const [awayTeamId, setAwayTeamId] = useState<number | "">("");
  const [roundName, setRoundName] = useState("");
  const [matchDate, setMatchDate] = useState("");
  const [page, setPage] = useState(1);

  const { data: leaguesData } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const adminLeagues = leaguesData ?? [];

  const teamQueries = useQueries({
    queries: adminLeagues.map((league: any) => ({
      queryKey: ["league-teams", league.id],
      queryFn: () => getTeamsLeague(league.id),
      enabled: adminLeagues.length > 0,
      staleTime: 60_000,
    })),
  });

  const allTeams: TeamOption[] = useMemo(() => {
    const result: TeamOption[] = [];
    teamQueries.forEach((query, i) => {
      const league = adminLeagues[i];
      const teams = query.data?.teams ?? [];
      teams.forEach((team: any) => {
        result.push({
          id: team.id,
          name: team.name,
          leagueName: league?.name ?? `Liga ${league?.id}`,
        });
      });
    });
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [teamQueries, adminLeagues]);

  const { data: friendlyData, isLoading } = useQuery({
    queryKey: ["admin-friendly-matches", page],
    queryFn: () => listFriendlyMatches(page, 20),
  });

  const friendlyMatches = friendlyData?.data ?? [];
  const totalPages = friendlyData ? Math.ceil(friendlyData.total / friendlyData.pageSize) : 0;

  const createMutation = useMutation({
    mutationFn: () =>
      createFriendlyMatch({
        homeTeamId: Number(homeTeamId),
        awayTeamId: Number(awayTeamId),
        roundName: roundName || undefined,
        date: matchDate || undefined,
      }),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: ["admin-friendly-matches"] });
      setHomeTeamId("");
      setAwayTeamId("");
      setRoundName("");
      setMatchDate("");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Error al crear partido amistoso");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (matchId: number) => deleteFriendlyMatch(matchId),
    onSuccess: () => {
      toast.success("Partido amistoso eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-friendly-matches"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error ?? error?.message ?? "Error al eliminar");
    },
  });

  const canCreate = !!homeTeamId && !!awayTeamId && homeTeamId !== awayTeamId;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-black text-[var(--geo-text)]">
        Partidos Amistosos
      </h1>
      <p className="mt-1 text-sm text-[var(--geo-text-muted)]">
        Crea partidos amistosos entre equipos de cualquiera de las ligas que administras, incluso de ligas diferentes.
      </p>

      {/* Create Form */}
      <section className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <h2 className="text-lg font-bold text-[var(--geo-text)] mb-4">Crear nuevo partido amistoso</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text-muted)] mb-1">
              Nombre de jornada (opcional)
            </label>
            <input
              type="text"
              value={roundName}
              onChange={(e) => setRoundName(e.target.value)}
              placeholder="Amistoso"
              className="w-full rounded-lg border border-white/10 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text-muted)] mb-1">
              Fecha y hora (opcional)
            </label>
            <input
              type="datetime-local"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text-muted)] mb-1">
              Equipo local
            </label>
            <select
              value={homeTeamId}
              onChange={(e) => setHomeTeamId(e.target.value ? Number(e.target.value) : "")}
              disabled={!allTeams.length}
              className="w-full rounded-lg border border-white/10 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)] disabled:opacity-50"
            >
              <option value="">Selecciona equipo local</option>
              {allTeams.map((team) => (
                <option key={`home-${team.id}`} value={team.id}>
                  {team.name} — {team.leagueName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[var(--geo-text-muted)] mb-1">
              Equipo visitante
            </label>
            <select
              value={awayTeamId}
              onChange={(e) => setAwayTeamId(e.target.value ? Number(e.target.value) : "")}
              disabled={!allTeams.length}
              className="w-full rounded-lg border border-white/10 bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)] disabled:opacity-50"
            >
              <option value="">Selecciona equipo visitante</option>
              {allTeams
                .filter((team) => team.id !== homeTeamId)
                .map((team) => (
                  <option key={`away-${team.id}`} value={team.id}>
                    {team.name} — {team.leagueName}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {homeTeamId && awayTeamId && homeTeamId === awayTeamId ? (
          <p className="mt-3 text-sm text-red-400">El equipo local y visitante no pueden ser el mismo.</p>
        ) : null}

        <button
          type="button"
          onClick={() => createMutation.mutate()}
          disabled={!canCreate || createMutation.isPending}
          className="mt-4 rounded-lg bg-geo-green px-6 py-2 text-sm font-bold text-geo-black transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {createMutation.isPending ? "Creando..." : "Crear partido amistoso"}
        </button>
      </section>

      {/* List */}
      <section className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <h2 className="text-lg font-bold text-[var(--geo-text)] mb-4">
          Partidos amistosos {friendlyData ? `(${friendlyData.total})` : ""}
        </h2>

        {isLoading ? (
          <p className="text-sm text-[var(--geo-text-muted)]">Cargando...</p>
        ) : friendlyMatches.length === 0 ? (
          <p className="text-sm text-[var(--geo-text-muted)]">No hay partidos amistosos creados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase text-[var(--geo-text-muted)]">
                  <th className="pb-3 pr-4">Local</th>
                  <th className="pb-3 pr-4">Visitante</th>
                  <th className="pb-3 pr-4">Fecha</th>
                  <th className="pb-3 pr-4">Marcador</th>
                  <th className="pb-3 pr-4">Jornada</th>
                  <th className="pb-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {friendlyMatches.map((match: any) => (
                  <tr key={match.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-[var(--geo-text)]">
                      {match.homeTeam?.name ?? `Equipo ${match.homeTeamId}`}
                    </td>
                    <td className="py-3 pr-4 text-[var(--geo-text)]">
                      {match.awayTeam?.name ?? `Equipo ${match.awayTeamId}`}
                    </td>
                    <td className="py-3 pr-4 text-[var(--geo-text-muted)]">
                      {match.date ? new Date(match.date).toLocaleString() : "Sin fecha"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--geo-text)]">
                      {match.played ? `${match.homeScore} - ${match.awayScore}` : "Pendiente"}
                    </td>
                    <td className="py-3 pr-4 text-[var(--geo-text-muted)]">
                      {match.roundName}
                    </td>
                    <td className="py-3 flex items-center gap-2">
                      <Link
                        to={`/public/matches/${match.id}/detail`}
                        className="text-xs text-geo-green hover:underline"
                      >
                        Ver detalle
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("¿Eliminar este partido amistoso?")) {
                            deleteMutation.mutate(match.id);
                          }
                        }}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 ? (
          <div className="mt-4 flex items-center gap-2 justify-center">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded bg-white/10 px-3 py-1 text-xs text-[var(--geo-text)] disabled:opacity-30"
            >
              Anterior
            </button>
            <span className="text-xs text-[var(--geo-text-muted)]">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded bg-white/10 px-3 py-1 text-xs text-[var(--geo-text)] disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
