import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamById,
  getPlayersTeam,
  findPlayer,
  addPlayerToTeam,
  removePlayerFromTeam,
  teamLogoUrl,
  updateTeam,
  updatePlayerAvatar,
  avatarUrl as playerAvatarUrl,
} from "@/api/teamAPI";
import { useState } from "react";
import { toast } from "react-toastify";
import { UserGroupIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TeamInvitationMenu } from "@/components/InvitationMenus/TeamInvitationMenu";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";
import { VictoryAxis, VictoryBar, VictoryChart, VictoryGroup } from "victory";
import type { Team } from "@/types";

export default function TeamDetailView() {
  const { teamId } = useParams<{ teamId: string }>();
  const id = Number(teamId);
  const isValidTeamId = Number.isInteger(id) && id > 0;
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();
  const [playerEmail, setPlayerEmail] = useState("");
  const [foundPlayer, setFoundPlayer] = useState<{ id: number; name: string; email: string } | null>(null);
  const [searching, setSearching] = useState(false);
  const backToTeamsPath =
    currentUser?.role === "player"
      ? "/my-teams"
      : currentUser?.role === "coach"
      ? "/coach/teams"
      : "/dashboard";

  const { data: team, isLoading, isError, error } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamById(id),
    enabled: isValidTeamId,
  });

  const { data: players } = useQuery({
    queryKey: ["team-players", id],
    queryFn: () => getPlayersTeam(id),
    enabled: isValidTeamId,
  });

  const addPlayerMutation = useMutation({
    mutationFn: (playerId: number) => addPlayerToTeam(id, playerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team-players", id] });
      setFoundPlayer(null);
      setPlayerEmail("");
      toast.success("Jugador agregado");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo agregar el jugador")),
  });

  const removePlayerMutation = useMutation({
    mutationFn: (playerId: number) => removePlayerFromTeam(id, playerId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["team-players", id] });
      toast.success("Jugador eliminado");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo quitar el jugador")),
  });

  async function handleFindPlayer() {
    if (!playerEmail.trim()) return;
    setSearching(true);
    setFoundPlayer(null);
    try {
      const p = await findPlayer(id, playerEmail.trim());
      setFoundPlayer(p);
    } catch (e) {
      toast.error(getApiErrorMessage(e, "Jugador no encontrado"));
    } finally {
      setSearching(false);
    }
  }

  if (!isValidTeamId) {
    return (
      <div className="card-pitch border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
        El identificador del equipo no es valido.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-8 text-center text-[var(--geo-text-muted)]">
        Cargando equipo…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Link
          to={backToTeamsPath}
          className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
        >
          ← Volver a equipos
        </Link>
        <div className="card-pitch border-red-500/30 bg-red-500/10 p-5 text-red-400">
          {error instanceof Error ? error.message : "No se pudo cargar el detalle del equipo."}
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="card-pitch border-amber-500/30 bg-amber-500/10 p-5 text-amber-300">
        No se encontro el equipo solicitado.
      </div>
    );
  }

  const canManagePlayers = team.trainerId === currentUser?.id;
  const safeNumber = (value: unknown) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  };
  const rawStats: Partial<NonNullable<Team["stats"]>> = team?.stats ?? {};
  const stats = {
    playedMatches: safeNumber(rawStats.playedMatches),
    wins: safeNumber(rawStats.wins),
    draws: safeNumber(rawStats.draws),
    losses: safeNumber(rawStats.losses),
    points: safeNumber(rawStats.points),
    goalsFor: safeNumber(rawStats.goalsFor),
    goalsAgainst: safeNumber(rawStats.goalsAgainst),
    goalDifference: safeNumber(rawStats.goalDifference),
  };

  const played = Math.max(1, stats.playedMatches);
  const resultRatio = {
    winsPct: Math.round((stats.wins / played) * 100),
    drawsPct: Math.round((stats.draws / played) * 100),
    lossesPct: Math.round((stats.losses / played) * 100),
  };

  const performanceChartData = [
    { x: "GF", y: stats.goalsFor },
    { x: "GC", y: stats.goalsAgainst },
    { x: "DG", y: stats.goalDifference },
    { x: "PTS", y: stats.points },
  ];

  const resultsBarsData = [
    { x: "G", y: stats.wins },
    { x: "E", y: stats.draws },
    { x: "P", y: stats.losses },
  ];

  return (
    <div className="space-y-6 opacity-0 animate-in-up">
      <Link
        to={backToTeamsPath}
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Volver a equipos
      </Link>
      <div className="mt-4 flex items-center gap-4 opacity-0 animate-in-up stagger-1">
        <div className="relative">
          {team.logoUrl ? (
            <img
              src={teamLogoUrl(team.logoUrl)}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-geo-green/20">
              <UserGroupIcon className="h-8 w-8 text-geo-green" />
            </div>
          )}
          {canManagePlayers && (
            <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-geo-green p-1 shadow" title="Cambiar logo del equipo">
              <PlusIcon className="h-3 w-3 text-geo-black" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    await updateTeam(id, { logo: file });
                    void queryClient.invalidateQueries({ queryKey: ["team", id] });
                    toast.success("Logo actualizado");
                  } catch {
                    toast.error("No se pudo actualizar el logo");
                  }
                }}
              />
            </label>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-black text-geo-green">{team.name}</h1>
          {team.fieldAddress && (
            <p className="text-[var(--geo-text-muted)]">{team.fieldAddress}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 opacity-0 animate-in-up stagger-2 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Coach" value={team.trainer?.name ?? "—"} accent="text-[var(--geo-text)]" />
        <MetricCard label="Cancha" value={team.fieldAddress ?? "—"} accent="text-[var(--geo-text)]" />
        <MetricCard label="Liga" value={team.league?.name ?? "Sin liga"} accent="text-[var(--geo-text)]" />
        <MetricCard label="Puntos" value={String(stats.points)} accent="text-geo-green" />
      </div>

      <div className="grid gap-3 opacity-0 animate-in-up stagger-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatPill label="PJ" value={stats.playedMatches} />
        <StatPill label="G" value={stats.wins} />
        <StatPill label="E" value={stats.draws} />
        <StatPill label="P" value={stats.losses} />
        <StatPill label="DG" value={stats.goalDifference} />
      </div>

      <div className="grid gap-4 opacity-0 animate-in-up stagger-4 xl:grid-cols-2">
        <section className="card-pitch p-5">
          <h2 className="font-geo text-xl text-[var(--geo-text)]">Dashboard de rendimiento</h2>
          <p className="mb-2 text-xs text-[var(--geo-text-muted)]">Comparativo de producción y rendimiento general</p>
          <VictoryChart domainPadding={{ x: 24, y: 14 }} height={260}>
            <VictoryAxis
              style={{
                axis: { stroke: "#3f3f46" },
                tickLabels: { fill: "#a1a1aa", fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: "#3f3f46" },
                tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                grid: { stroke: "#27272a", strokeDasharray: "4,4" },
              }}
            />
            <VictoryBar
              data={performanceChartData}
              style={{ data: { fill: "rgba(57,255,20,0.45)", stroke: "#39FF14", strokeWidth: 1.1 } }}
              barWidth={24}
              cornerRadius={5}
            />
          </VictoryChart>
        </section>

        <section className="card-pitch p-5">
          <h2 className="font-geo text-xl text-[var(--geo-text)]">Balance de resultados</h2>
          <p className="mb-3 text-xs text-[var(--geo-text-muted)]">Distribucion de victorias, empates y derrotas</p>
          <VictoryChart domainPadding={{ x: 24, y: 14 }} height={220}>
            <VictoryAxis
              style={{
                axis: { stroke: "#3f3f46" },
                tickLabels: { fill: "#a1a1aa", fontSize: 10 },
              }}
            />
            <VictoryAxis
              dependentAxis
              style={{
                axis: { stroke: "#3f3f46" },
                tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                grid: { stroke: "#27272a", strokeDasharray: "4,4" },
              }}
            />
            <VictoryGroup colorScale={["#39FF14"]}>
              <VictoryBar data={resultsBarsData} barWidth={28} cornerRadius={5} />
            </VictoryGroup>
          </VictoryChart>

          <div className="mt-2 space-y-2">
            <ProgressRow label="Victorias" value={resultRatio.winsPct} color="bg-emerald-400" />
            <ProgressRow label="Empates" value={resultRatio.drawsPct} color="bg-blue-300" />
            <ProgressRow label="Derrotas" value={resultRatio.lossesPct} color="bg-red-400" />
          </div>
        </section>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 opacity-0 animate-in-up stagger-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 font-bold text-[var(--geo-text)]">
            <UserGroupIcon className="h-5 w-5 text-geo-green" />
            Jugadores ({players?.length ?? 0})
          </h2>
          <TeamInvitationMenu
            teamId={id}
            userIsTrainer={team?.trainerId === currentUser?.id}
          />
        </div>

        {canManagePlayers ? (
        <div className="mt-4 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] p-4">
          <p className="text-sm font-semibold text-[var(--geo-text)]">
            Buscar jugador por email para agregar
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input
              type="email"
              placeholder="email@jugador.com"
              value={playerEmail}
              onChange={(e) => setPlayerEmail(e.target.value)}
              className="min-w-[200px] flex-1 rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-3 py-2 text-[var(--geo-text)]"
            />
            <button
              type="button"
              onClick={handleFindPlayer}
              disabled={searching}
              className="rounded-lg bg-geo-green px-4 py-2 font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
            >
              {searching ? "Buscando…" : "Buscar"}
            </button>
          </div>
          {foundPlayer && (
            <div className="mt-3 flex items-center justify-between rounded border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-3 py-2">
              <span className="text-[var(--geo-text)]">
                {foundPlayer.name} ({foundPlayer.email})
              </span>
              <button
                type="button"
                onClick={() => addPlayerMutation.mutate(foundPlayer.id)}
                disabled={addPlayerMutation.isPending}
                className="flex items-center gap-1 rounded bg-geo-green px-3 py-1 text-sm font-bold text-geo-black hover:bg-geo-green-hover disabled:opacity-60"
              >
                <PlusIcon className="h-4 w-4" /> Agregar
              </button>
            </div>
          )}
        </div>
        ) : null}

        {players && players.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {players.map((p) => {
              const isCurrentPlayer = currentUser?.role === "player" && currentUser.id === p.id;
              return (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {p.avatarUrl ? (
                      <img
                        src={playerAvatarUrl(p.avatarUrl)}
                        alt={p.playerName || p.name}
                        className="h-9 w-9 rounded-full object-cover border border-geo-green/30"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-geo-green/10 text-xs font-bold text-geo-green border border-geo-green/20">
                        {(p.playerName || p.name).charAt(0).toUpperCase()}
                      </div>
                    )}
                    {isCurrentPlayer && (
                      <label className="absolute -bottom-1 -right-1 cursor-pointer rounded-full bg-geo-green p-0.5 shadow" title="Cambiar mi foto">
                        <PlusIcon className="h-2.5 w-2.5 text-geo-black" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              await updatePlayerAvatar(id, file);
                              void queryClient.invalidateQueries({ queryKey: ["team-players", id] });
                              toast.success("Foto actualizada");
                            } catch {
                              toast.error("No se pudo actualizar la foto");
                            }
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <span className="font-medium text-[var(--geo-text)]">
                    {p.playerName || p.name}
                    {p.jerseyNumber ? (
                      <span className="ml-2 rounded bg-geo-green/15 px-2 py-0.5 text-xs font-bold text-geo-green">
                        #{p.jerseyNumber}
                      </span>
                    ) : null}
                    <span className="ml-2 text-sm text-[var(--geo-text-muted)]">
                      {p.email}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removePlayerMutation.mutate(p.id)}
                  disabled={!canManagePlayers}
                  hidden={!canManagePlayers}
                  className="text-red-500 hover:text-red-400"
                  title="Quitar del equipo"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-[var(--geo-text-muted)]">
            Aún no hay jugadores. Busca por email para agregar.
          </p>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card-pitch p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">{label}</p>
      <p className={`mt-2 text-2xl font-geo ${accent}`}>{value}</p>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-3 text-center">
      <p className="text-xs text-[var(--geo-text-muted)]">{label}</p>
      <p className="text-xl font-black text-[var(--geo-text)]">{value}</p>
    </div>
  );
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-[var(--geo-text-muted)]">{label}</span>
        <span className="font-semibold text-[var(--geo-text)]">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10">
        <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
