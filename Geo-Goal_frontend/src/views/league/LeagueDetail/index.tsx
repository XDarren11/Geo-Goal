import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeagueById,
  getFixture,
  generateFixture,
  addTeamToLeague,
  getTrainerTeams,
  removeTeamFromLeague,
  restructureFixture,
  updateLeagueLogo,
  leagueLogoFullUrl,
  generateSecondRound,
} from "@/api/leagueAPI";
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  TrophyIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ExclamationTriangleIcon
} from "@heroicons/react/24/outline";
import UpdateScoreModal from "@/components/Modals/UpdateScoreModal";
import UpdateScheduleModal from "@/components/Modals/UpdateScheduleModal";
import { LeagueInvitationMenu } from "@/components/InvitationMenus/LeagueInvitationMenu";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import type { FixtureByRound, League, Match, Team } from "@/types";

type RoundEntry = { round: string; matches: Match[] };

export default function LeagueDetailView() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const id = Number(leagueId);
  const isValidLeagueId = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [trainerEmail, setTrainerEmail] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [trainerTeams, setTrainerTeams] = useState<{ id: number; name: string }[]>([]);
  const [searchingTrainer, setSearchingTrainer] = useState(false);
  const [, setSelectedTeamId] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState<Match | null>(null);
  const [needsRestructure, setNeedsRestructure] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [matchTime, setMatchTime] = useState("20:00");
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(7);
  const [matchDuration, setMatchDuration] = useState<number>(60); 

  const { data: league, isLoading, isError, error } = useQuery<League & { teams: Team[] }>({
    queryKey: ["league", id],
    queryFn: () => getLeagueById(id),
    enabled: isValidLeagueId,
  });

  const { data: fixture, isLoading: loadingFixture } = useQuery<FixtureByRound>({
    queryKey: ["fixture", id],
    queryFn: () => getFixture(id),
    enabled: isValidLeagueId,
  });

  const secondRoundMutation = useMutation({
    mutationFn: (leagueId: number) => generateSecondRound(leagueId),
    onSuccess: (data) => {
      toast.success(`¡Segunda vuelta creada! (${data.count} partidos nuevos)`);
      queryClient.invalidateQueries({ queryKey: ["fixture", leagueId] }); 
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Error al generar la segunda vuelta");
    }
  });


  const addTeamMutation = useMutation({
    mutationFn: ({ teamId }: { teamId: number }) => addTeamToLeague(id, teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["league", id] });
      setShowAddTeam(false);
      setTrainerEmail("");
      setTrainerTeams([]);
      setSelectedTeamId(null);
      toast.success("Equipo agregado a la liga");
      setNeedsRestructure(true);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo agregar el equipo")),
  });

  const removeTeamMutation = useMutation({
    mutationFn: (teamId: number) => removeTeamFromLeague(id, teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["league", id] });
      toast.success("Equipo quitado de la liga");
      setNeedsRestructure(true);
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo quitar el equipo")),
  });

  const generateFixtureMutation = useMutation({
  mutationFn: (type: "round-robin" | "knockout") =>
    generateFixture(id, type, {
      ...(scheduleStartDate ? { scheduleStartDate } : {}),
      ...(matchTime ? { matchTime } : {}),
      ...(Number.isFinite(daysBetweenRounds) ? { daysBetweenRounds } : {}),
      // AGREGA ESTA LÍNEA:
      ...(Number.isFinite(matchDuration) ? { matchDuration } : {}),
    }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["fixture", id] });
    toast.success("Fixture generado");
    setNeedsRestructure(false);
  },
  onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo generar el fixture")),
});

  const restructureMutation = useMutation({
    mutationFn: () => restructureFixture(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixture", id] });
      toast.success("Calendario reestructurado exitosamente");
      setNeedsRestructure(false); 
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo reestructurar el calendario")),
  });

  async function handleSearchTrainer() {
    if (!trainerEmail.trim()) return;
    setSearchingTrainer(true);
    try {
      const res = await getTrainerTeams(id, trainerEmail.trim());
      setTrainerTeams(res);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Error al buscar"));
    } finally {
      setSearchingTrainer(false);
    }
  }

  const teams = useMemo(() => league?.teams ?? [], [league?.teams]);
  const fixtureMatches = useMemo<Match[]>(() => {
    if (!fixture) return [];
    return Object.values(fixture).flatMap((roundMatches) =>
      Array.isArray(roundMatches) ? roundMatches : []
    );
  }, [fixture]);

  const dashboardMetrics = useMemo(() => {
    const matches = fixtureMatches;
    const playedMatches = matches.filter((match) => match.played);
    const pendingMatches = matches.length - playedMatches.length;
    const totalGoals = playedMatches.reduce((acc, match) => acc + (match.homeScore || 0) + (match.awayScore || 0), 0);
    const avgGoalsPerPlayedMatch = playedMatches.length ? (totalGoals / playedMatches.length).toFixed(2) : "0.00";
    const completionRate = matches.length ? Math.round((playedMatches.length / matches.length) * 100) : 0;

    const teamPerformance = teams
      .map((team) => {
        const played = playedMatches.filter((match) => match.homeTeam?.id === team.id || match.awayTeam?.id === team.id);
        const goalsFor = played.reduce((acc, match) => {
          if (match.homeTeam?.id === team.id) return acc + (match.homeScore || 0);
          if (match.awayTeam?.id === team.id) return acc + (match.awayScore || 0);
          return acc;
        }, 0);
        const goalsAgainst = played.reduce((acc, match) => {
          if (match.homeTeam?.id === team.id) return acc + (match.awayScore || 0);
          if (match.awayTeam?.id === team.id) return acc + (match.homeScore || 0);
          return acc;
        }, 0);
        return {
          id: team.id,
          name: team.name,
          played: played.length,
          goalsFor,
          goalsAgainst,
          balance: goalsFor - goalsAgainst,
        };
      })
      .sort((a, b) => b.balance - a.balance || b.goalsFor - a.goalsFor)
      .slice(0, 5);

    const topGoalsFor = teamPerformance.reduce((max, team) => Math.max(max, team.goalsFor), 1);
    const topBalance = teamPerformance.reduce((max, team) => Math.max(max, team.balance), 1);

    return {
      totalMatches: matches.length,
      playedMatches: playedMatches.length,
      pendingMatches,
      totalGoals,
      avgGoalsPerPlayedMatch,
      completionRate,
      teamPerformance,
      topGoalsFor,
      topBalance,
    };
  }, [fixtureMatches, teams]);

  const nextMatch = useMemo(() => {
    const now = Date.now();
    const upcomingMatches = fixtureMatches.filter(
      (match): match is Match & { date: string } =>
        typeof match.date === "string" && new Date(match.date).getTime() >= now
    );

    return upcomingMatches.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )[0];
  }, [fixtureMatches]);

  const teamCards = useMemo(() => {
    return teams.map((team) => {
      const playedMatches = fixtureMatches.filter(
        (match) => match.played && (match.homeTeam?.id === team.id || match.awayTeam?.id === team.id)
      );
      const pendingMatches = fixtureMatches.filter(
        (match) => !match.played && (match.homeTeam?.id === team.id || match.awayTeam?.id === team.id)
      );
      const goalsFor = playedMatches.reduce((acc, match) => {
        if (match.homeTeam?.id === team.id) return acc + (match.homeScore || 0);
        if (match.awayTeam?.id === team.id) return acc + (match.awayScore || 0);
        return acc;
      }, 0);
      return {
        id: team.id,
        name: team.name,
        played: playedMatches.length,
        pending: pendingMatches.length,
        goalsFor,
      };
    });
  }, [teams, fixtureMatches]);

  const roundEntries = useMemo<RoundEntry[]>(() => {
    if (!fixture) return [];
    return Object.entries(fixture).map(([round, matches]) => ({
      round,
      matches: Array.isArray(matches) ? matches : [],
    }));
  }, [fixture]);

  const roundInsights = useMemo(() => {
    const maxMatches = roundEntries.reduce((max, entry) => Math.max(max, entry.matches.length), 1);
    return roundEntries.map((entry) => {
      const played = entry.matches.filter((match) => match.played).length;
      const pending = entry.matches.length - played;
      const completion = entry.matches.length ? Math.round((played / entry.matches.length) * 100) : 0;
      return {
        round: entry.round,
        total: entry.matches.length,
        played,
        pending,
        completion,
        loadPct: Math.round((entry.matches.length / maxMatches) * 100),
      };
    });
  }, [roundEntries]);

  const teamDashboardRows = useMemo(() => {
    const playedMatches = fixtureMatches.filter((match) => match.played);
    const maxGoalsFor = teams.reduce((max, team) => {
      const goals = playedMatches.reduce((acc, match) => {
        if (match.homeTeam?.id === team.id) return acc + (match.homeScore || 0);
        if (match.awayTeam?.id === team.id) return acc + (match.awayScore || 0);
        return acc;
      }, 0);
      return Math.max(max, goals);
    }, 1);

    return teams
      .map((team) => {
        const played = playedMatches.filter((match) => match.homeTeam?.id === team.id || match.awayTeam?.id === team.id);
        const goalsFor = played.reduce((acc, match) => {
          if (match.homeTeam?.id === team.id) return acc + (match.homeScore || 0);
          if (match.awayTeam?.id === team.id) return acc + (match.awayScore || 0);
          return acc;
        }, 0);
        const goalsAgainst = played.reduce((acc, match) => {
          if (match.homeTeam?.id === team.id) return acc + (match.awayScore || 0);
          if (match.awayTeam?.id === team.id) return acc + (match.homeScore || 0);
          return acc;
        }, 0);
        return {
          id: team.id,
          name: team.name,
          goalsFor,
          goalsAgainst,
          balance: goalsFor - goalsAgainst,
          attackPct: Math.max(6, Math.round((goalsFor / maxGoalsFor) * 100)),
        };
      })
      .sort((a, b) => b.goalsFor - a.goalsFor)
      .slice(0, 6);
  }, [teams, fixtureMatches]);

  const weekdayDistribution = useMemo(() => {
    const labels = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const buckets = labels.map((label, index) => ({ label, index, count: 0 }));
    fixtureMatches.forEach((match) => {
      if (!match.date) return;
      const day = new Date(match.date).getDay();
      buckets[day].count += 1;
    });
    const maxCount = buckets.reduce((max, bucket) => Math.max(max, bucket.count), 1);
    return buckets.map((bucket) => ({
      ...bucket,
      heightPct: bucket.count ? Math.max(10, Math.round((bucket.count / maxCount) * 100)) : 6,
    }));
  }, [fixtureMatches]);

  if (!isValidLeagueId) {
    return (
      <div className="card-pitch border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
        El identificador de la liga no es valido.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-[var(--geo-text-muted)]">
        Cargando liga…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Link
          to="/leagues"
          className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
        >
          ← Volver a ligas
        </Link>
        <div className="card-pitch border-red-500/30 bg-red-500/10 p-5 text-red-400">
          {error instanceof Error ? error.message : "No se pudo cargar el detalle de la liga."}
        </div>
      </div>
    );
  }

  if (!league) {
    return (
      <div className="card-pitch border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
        No se encontro la liga solicitada.
      </div>
    );
  }

  return (
    <div className="space-y-6 opacity-0 animate-in-up">
      <Link
        to="/leagues"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Volver a ligas
      </Link>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-geo-green">{league.name}</h1>
          {league.description && (
            <p className="mt-2 text-[var(--geo-text-muted)]">{league.description}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Equipos" value={teams.length} accent="text-geo-green" />
        <MetricCard label="Partidos totales" value={dashboardMetrics.totalMatches} accent="text-[var(--geo-text)]" />
        <MetricCard label="Jugados" value={dashboardMetrics.playedMatches} accent="text-emerald-400" />
        <MetricCard label="Pendientes" value={dashboardMetrics.pendingMatches} accent="text-amber-300" />
        <MetricCard label="Goles totales" value={dashboardMetrics.totalGoals} accent="text-sky-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="card-pitch p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-[var(--geo-text)]">Estado competitivo</h2>
            <span className="rounded-full bg-geo-green/15 px-3 py-1 text-xs font-semibold text-geo-green">
              Avance {dashboardMetrics.completionRate}%
            </span>
          </div>
          <div className="mb-5 h-2 w-full rounded-full bg-white/10">
            <div
              className="h-2 rounded-full bg-geo-green transition-all duration-700"
              style={{ width: `${dashboardMetrics.completionRate}%` }}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatPill title="Promedio de goles" value={dashboardMetrics.avgGoalsPerPlayedMatch} helper="por partido jugado" />
            <StatPill title="Partidos cerrados" value={`${dashboardMetrics.playedMatches}`} helper="con marcador final" />
            <StatPill title="Partidos por jugar" value={`${dashboardMetrics.pendingMatches}`} helper="pendientes de resultado" />
          </div>
        </section>

        <section className="card-pitch p-5">
          <h2 className="font-bold text-[var(--geo-text)]">Próximo partido</h2>
          {nextMatch ? (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-semibold text-[var(--geo-text)]">
                {nextMatch.homeTeam?.name ?? "Local"} vs {nextMatch.awayTeam?.name ?? "Visitante"}
              </p>
              <p className="text-xs text-[var(--geo-text-muted)]">
                {nextMatch.roundName || "Jornada"} · {new Date(nextMatch.date).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-[var(--geo-text-muted)]">
              No hay partidos futuros programados.
            </p>
          )}
        </section>
      </div>

      {!!dashboardMetrics.teamPerformance.length && (
        <section className="card-pitch p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[var(--geo-text)]">Ranking visual de rendimiento</h2>
            <span className="text-xs text-[var(--geo-text-muted)]">Top 5 por diferencial de goles</span>
          </div>
          <div className="space-y-4">
            {dashboardMetrics.teamPerformance.map((team) => {
              const goalsWidth = Math.max(8, Math.round((team.goalsFor / dashboardMetrics.topGoalsFor) * 100));
              const balanceWidth = team.balance > 0 ? Math.max(8, Math.round((team.balance / dashboardMetrics.topBalance) * 100)) : 0;
              return (
                <div key={team.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-[var(--geo-text)]">{team.name}</p>
                    <p className="text-xs text-[var(--geo-text-muted)]">
                      PJ {team.played} · GF {team.goalsFor} · GC {team.goalsAgainst}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--geo-text-muted)]">Ataque (GF)</span>
                        <span className="text-geo-green">{team.goalsFor}</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-geo-green transition-all duration-700" style={{ width: `${goalsWidth}%` }} />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--geo-text-muted)]">Balance</span>
                        <span className={team.balance >= 0 ? "text-emerald-300" : "text-red-300"}>
                          {team.balance >= 0 ? `+${team.balance}` : team.balance}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10">
                        <div
                          className={`h-2 rounded-full transition-all duration-700 ${
                            team.balance >= 0 ? "bg-emerald-300" : "bg-red-300"
                          }`}
                          style={{ width: `${team.balance >= 0 ? balanceWidth : goalsWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="card-pitch p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-[var(--geo-text)]">Dashboard ofensivo y balance</h2>
            <span className="text-xs text-[var(--geo-text-muted)]">Top 6 equipos por goles a favor</span>
          </div>
          {!teamDashboardRows.length ? (
            <p className="text-sm text-[var(--geo-text-muted)]">Aun no hay partidos jugados para analitica ofensiva.</p>
          ) : (
            <div className="space-y-3">
              {teamDashboardRows.map((team) => (
                <div key={team.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-[var(--geo-text)]">{team.name}</p>
                    <p className="text-xs text-[var(--geo-text-muted)]">
                      GF {team.goalsFor} · GC {team.goalsAgainst} · DIF {team.balance >= 0 ? `+${team.balance}` : team.balance}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-geo-green transition-all duration-700" style={{ width: `${team.attackPct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-pitch p-5">
          <h2 className="font-bold text-[var(--geo-text)]">Carga por dia</h2>
          <p className="mt-1 text-xs text-[var(--geo-text-muted)]">Distribucion semanal de partidos programados</p>
          <div className="mt-5 grid h-36 grid-cols-7 items-end gap-2">
            {weekdayDistribution.map((bucket) => (
              <WeekdayBar key={bucket.label} label={bucket.label} value={bucket.count} heightPct={bucket.heightPct} />
            ))}
          </div>
        </div>
      </section>

      <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <h2 className="flex items-center gap-2 font-bold text-[var(--geo-text)]">
          <TrophyIcon className="h-5 w-5 text-geo-green" />
          Logo de la liga
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          {league.logoUrl ? (
            <img
              src={leagueLogoFullUrl(league.logoUrl)}
              alt={league.name}
              className="h-20 w-20 rounded-full object-cover border-2 border-geo-green/40"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-geo-green/10 border-2 border-dashed border-geo-green/30">
              <TrophyIcon className="h-8 w-8 text-geo-green/50" />
            </div>
          )}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 rounded-lg bg-geo-green/10 px-4 py-2 text-sm font-semibold text-geo-green transition-colors hover:bg-geo-green/20">
              {league.logoUrl ? "Cambiar logo" : "Subir logo"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await updateLeagueLogo(id, file);
                  void queryClient.invalidateQueries({ queryKey: ["league", id] });
                  toast.success("Logo actualizado");
                } catch {
                  toast.error("No se pudo actualizar el logo");
                }
              }}
            />
          </label>
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-bold text-[var(--geo-text)]">
            <UserGroupIcon className="h-5 w-5 text-geo-green" />
            Equipos ({teams.length})
          </h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowAddTeam(!showAddTeam)}
              className="inline-flex items-center gap-2 rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover"
            >
              <PlusIcon className="h-5 w-5" />
              Agregar equipo
            </button>
            <LeagueInvitationMenu
              leagueId={id}
              userIsManager={league?.managerId === currentUser?.id}
            />
          </div>
        </div>

        {showAddTeam && (
          <div className="mt-4 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] p-4">
            <p className="text-sm font-semibold text-[var(--geo-text)]">
              Buscar entrenador por email e invitar equipo
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <input
                type="email"
                placeholder="email@entrenador.com"
                value={trainerEmail}
                onChange={(e) => setTrainerEmail(e.target.value)}
                className="flex-1 min-w-[200px] rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-3 py-2 text-[var(--geo-text)]"
              />
              <button
                type="button"
                onClick={handleSearchTrainer}
                disabled={searchingTrainer}
                className="rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
              >
                {searchingTrainer ? "Buscando…" : "Buscar"}
              </button>
            </div>
            {trainerTeams.length > 0 && (
              <div className="mt-3">
                <p className="text-sm text-[var(--geo-text-muted)]">
                  Equipos del entrenador:
                </p>
                <ul className="mt-2 space-y-1">
                  {trainerTeams.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span className="text-[var(--geo-text)]">{t.name}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTeamId(t.id);
                          addTeamMutation.mutate({ teamId: t.id });
                        }}
                        disabled={addTeamMutation.isPending}
                        className="rounded bg-geo-green px-3 py-1 text-sm font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
                      >
                        Agregar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {teams.length === 0 ? (
          <p className="mt-4 text-[var(--geo-text-muted)]">
            Aún no hay equipos. Agrega equipos buscando al entrenador por email.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {teamCards.map((team) => (
              <article
                key={team.id}
                className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] p-4 transition-colors hover:border-geo-green/40"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-geo-green/40 bg-geo-green/10 text-sm font-bold text-geo-green">
                      {team.name
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0]?.toUpperCase())
                        .join("")}
                    </div>
                    <div>
                      <p className="font-semibold text-[var(--geo-text)]">{team.name}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs">
                        <Link
                          to={`/teams/${team.id}`}
                          className="font-semibold text-geo-green hover:text-geo-green-hover"
                        >
                          Detalle
                        </Link>
                        <Link
                          to={`/teams/${team.id}/dashboard`}
                          className="inline-flex items-center gap-1 font-semibold text-sky-400 hover:text-sky-300"
                          title="Ver dashboard del equipo"
                        >
                          📊 Dashboard
                        </Link>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTeamMutation.mutate(team.id)}
                    className="text-red-500 hover:text-red-400"
                    title="Quitar de la liga"
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <MiniMetric label="PJ" value={team.played} />
                  <MiniMetric label="Pend." value={team.pending} />
                  <MiniMetric label="GF" value={team.goalsFor} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <h2 className="flex items-center gap-2 font-bold text-[var(--geo-text)]">
          <CalendarDaysIcon className="h-5 w-5 text-geo-green" />
          Calendario de partidos
        </h2>
        {needsRestructure && (
          <div className="mt-4 flex flex-col gap-3 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-yellow-500 flex-shrink-0" />
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Se detectaron cambios en los equipos. Es necesario reestructurar el calendario para incluir las nuevas jornadas.
              </p>
            </div>
            <button
              type="button"
              onClick={() => restructureMutation.mutate()}
              disabled={restructureMutation.isPending}
              className="whitespace-nowrap rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black hover:bg-yellow-400 disabled:opacity-60"
            >
              {restructureMutation.isPending ? "Aplicando..." : "Reestructurar ahora"}
            </button>
          </div>
        )}
        {teams.length < 2 ? (
          <p className="mt-4 text-[var(--geo-text-muted)]">
            Necesitas al menos 2 equipos para generar el fixture.
          </p>
        ) : (
          <>
            <div className="mt-4 flex gap-2">
              <input
                type="date"
                value={scheduleStartDate}
                onChange={(e) => setScheduleStartDate(e.target.value)}
                className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
                title="Fecha inicial del fixture"
              />
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
                title="Hora base de partidos"
              />
              <input
                type="number"
                min={0}
                max={30}
                value={daysBetweenRounds}
                onChange={(e) => setDaysBetweenRounds(Number(e.target.value || 0))}
                className="w-28 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
                title="Días entre jornadas"
              />
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  step={5}
                  value={matchDuration}
                  onChange={(e) => setMatchDuration(Number(e.target.value || 0))}
                  className="w-24 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text)]"
                  title="Duración del partido en minutos"
                  placeholder="Minutos"
                />
                <span className="text-xs text-[var(--geo-text-secondary)]">min</span>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--geo-text-muted)]">
              Si defines fecha/hora, el sistema programa jornadas automáticamente y notifica a entrenadores, jugadores y árbitros asignados.
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => generateFixtureMutation.mutate("round-robin")}
                disabled={generateFixtureMutation.isPending}
                className="rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
              >
                Generar todos contra todos
              </button>
              <button
                type="button"
                onClick={() => generateFixtureMutation.mutate("knockout")}
                disabled={generateFixtureMutation.isPending}
                className="rounded-lg border border-geo-green px-4 py-2 font-bold text-geo-green hover:bg-geo-green/10 disabled:opacity-60"
              >
                Generar eliminatorias
              </button>
              <button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={secondRoundMutation.isPending}
                  className="rounded-lg bg-geo-green px-4 py-2 text-sm font-bold text-black hover:brightness-110 disabled:opacity-50 transition-colors"
                >
                  {secondRoundMutation.isPending ? "Generando..." : "Generar Segunda Vuelta"}
                </button>

                {/* MODAL DE CONFIRMACIÓN ESTILO GEO-GOAL */}
                {showConfirmModal && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-2xl">
                      
                      <h3 className="font-geo text-2xl tracking-wide text-geo-green mb-3">
                        ¿Generar segunda vuelta?
                      </h3>
                      
                      <p className="text-[var(--geo-text-muted)] mb-6 text-sm leading-relaxed">
                        Esto clonará el fixture actual invirtiendo locales y visitantes. Los nuevos partidos se agregarán al calendario. ¿Estás seguro de continuar?
                      </p>
                      
                      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                        <button
                          onClick={() => setShowConfirmModal(false)}
                          className="rounded-xl border border-[var(--geo-border)] bg-transparent px-5 py-2.5 text-sm font-semibold text-[var(--geo-text)] hover:bg-[var(--geo-bg)] transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => {
                            setShowConfirmModal(false);
                            secondRoundMutation.mutate(Number(leagueId)); // O la variable que uses para el ID
                          }}
                          className="rounded-xl bg-geo-green px-5 py-2.5 text-sm font-bold text-black hover:brightness-110 shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all"
                        >
                          Sí, clonar partidos
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            {loadingFixture ? (
              <p className="mt-4 text-[var(--geo-text-muted)]">Cargando fixture…</p>
            ) : roundEntries.length > 0 ? (
              <div className="mt-6 space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {roundInsights.map((round) => (
                    <div key={`${round.round}-insight`} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm font-semibold text-[var(--geo-text)]">{round.round}</p>
                        <span className="text-xs text-geo-green">{round.completion}%</span>
                      </div>
                      <div className="mb-2 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-geo-green" style={{ width: `${round.completion}%` }} />
                      </div>
                      <p className="text-xs text-[var(--geo-text-muted)]">
                        {round.played}/{round.total} jugados · {round.pending} pendientes
                      </p>
                    </div>
                  ))}
                </div>

                {roundEntries.map(({ round, matches }) => {
                  const played = matches.filter((match) => match.played).length;
                  const pending = matches.length - played;
                  return (
                  <div key={round} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-semibold text-geo-green">{round}</h3>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-emerald-300">Jugados: {played}</span>
                        <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-amber-300">Pendientes: {pending}</span>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-2">
                      {matches.map((m) => (
                        <li
                          key={m.id}
                          className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-3 text-sm"
                        >
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex-1">
                              <p className="font-semibold text-[var(--geo-text)]">
                                {m.homeTeam?.name ?? "Local"} <span className="text-[var(--geo-text-muted)]">vs</span> {m.awayTeam?.name ?? "Visitante"}
                              </p>
                              <p className="text-xs text-[var(--geo-text-muted)]">
                                {m.date ? new Date(m.date).toLocaleString() : "Sin fecha programada"}
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              {m.played ? (
                                 <span className="rounded-md bg-geo-green/10 px-2 py-1 font-mono font-bold text-geo-green">
                                   {m.homeScore} - {m.awayScore}
                                 </span>
                              ) : (
                                 <span className="rounded-md bg-amber-500/10 px-2 py-1 text-xs font-semibold text-amber-300">Pendiente</span>
                              )}

                              <button
                                onClick={() => setSelectedMatch(m)}
                                className="text-zinc-400 transition-colors hover:text-geo-green"
                                title="Actualizar Resultado"
                              >
                                <PencilSquareIcon className="h-5 w-5" />
                              </button>

                              <button
                                onClick={() => {
                                  if (m.date && new Date(m.date).getTime() < Date.now()) return;
                                  setSelectedScheduleMatch(m);
                                }}
                                className="text-zinc-400 transition-colors hover:text-geo-green"
                                title={m.date && new Date(m.date).getTime() < Date.now() ? "Partido vencido: no editable" : "Programar fecha/hora"}
                              >
                                <CalendarDaysIcon className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )})}
              </div>
            ) : (
              <p className="mt-4 text-[var(--geo-text-muted)]">
                Genera el fixture con uno de los botones de arriba.
              </p>
            )}
          </>
        )}
      </div>

      {/* Renderizamos el modal al final */}
      <UpdateScoreModal
        isOpen={!!selectedMatch}
        match={selectedMatch}
        leagueId={id}
        onClose={() => setSelectedMatch(null)}
      />

      <UpdateScheduleModal
        isOpen={!!selectedScheduleMatch}
        match={selectedScheduleMatch}
        leagueId={id}
        onClose={() => setSelectedScheduleMatch(null)}
      />
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

function StatPill({ title, value, helper }: { title: string; value: string; helper: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">{title}</p>
      <p className="mt-1 text-xl font-bold text-[var(--geo-text)]">{value}</p>
      <p className="text-xs text-[var(--geo-text-muted)]">{helper}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] px-2 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-[var(--geo-text-muted)]">{label}</p>
      <p className="text-sm font-bold text-[var(--geo-text)]">{value}</p>
    </div>
  );
}

function WeekdayBar({ label, value, heightPct }: { label: string; value: number; heightPct: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-full rounded-t bg-white/10">
        <div className="w-full rounded-t bg-geo-green/80 transition-all duration-700" style={{ height: `${heightPct}%` }} />
      </div>
      <span className="text-[10px] text-[var(--geo-text-muted)]">{label}</span>
      <span className="text-[10px] font-semibold text-[var(--geo-text)]">{value}</span>
    </div>
  );
}
