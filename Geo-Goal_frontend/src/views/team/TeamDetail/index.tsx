import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTeamById,
  getPlayersTeam,
  findPlayer,
  addPlayerToTeam,
  removePlayerFromTeam,
  teamLogoUrl,
} from "@/api/teamAPI";
import { useState } from "react";
import { toast } from "react-toastify";
import { UserGroupIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { TeamInvitationMenu } from "@/components/InvitationMenus/TeamInvitationMenu";
import { useAuth } from "@/hooks/useAuth";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

export default function TeamDetailView() {
  const { teamId } = useParams<{ teamId: string }>();
  const id = Number(teamId);
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();
  const [playerEmail, setPlayerEmail] = useState("");
  const [foundPlayer, setFoundPlayer] = useState<{ id: number; name: string; email: string } | null>(null);
  const [searching, setSearching] = useState(false);

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", id],
    queryFn: () => getTeamById(id),
    enabled: Number.isInteger(id),
  });

  const { data: players } = useQuery({
    queryKey: ["team-players", id],
    queryFn: () => getPlayersTeam(id),
    enabled: Number.isInteger(id),
  });

  const addPlayerMutation = useMutation({
    mutationFn: (playerId: number) => addPlayerToTeam(id, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-players", id] });
      setFoundPlayer(null);
      setPlayerEmail("");
      toast.success("Jugador agregado");
    },
    onError: (e) => toast.error(getApiErrorMessage(e, "No se pudo agregar el jugador")),
  });

  const removePlayerMutation = useMutation({
    mutationFn: (playerId: number) => removePlayerFromTeam(id, playerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-players", id] });
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

  if (isLoading || !team) {
    return (
      <div className="py-8 text-center text-[var(--geo-text-muted)]">
        Cargando equipo…
      </div>
    );
  }

  return (
    <div>
      <Link
        to="/teams"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Volver a equipos
      </Link>
      <div className="mt-4 flex items-center gap-4">
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
        <div>
          <h1 className="text-3xl font-black text-geo-green">{team.name}</h1>
          {team.fieldAddress && (
            <p className="text-[var(--geo-text-muted)]">{team.fieldAddress}</p>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
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

        {players && players.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3"
              >
                <span className="font-medium text-[var(--geo-text)]">
                  {p.name}
                  <span className="ml-2 text-sm text-[var(--geo-text-muted)]">
                    {p.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => removePlayerMutation.mutate(p.id)}
                  className="text-red-500 hover:text-red-400"
                  title="Quitar del equipo"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
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
