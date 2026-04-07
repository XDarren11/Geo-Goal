import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getLeagueById,
  getFixture,
  generateFixture,
  addTeamToLeague,
  getTrainerTeams,
  removeTeamFromLeague,
  restructureFixture
} from "@/api/leagueAPI";
import { useState } from "react";
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

export default function LeagueDetailView() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const id = Number(leagueId);
  const queryClient = useQueryClient();
  const { data: currentUser } = useAuth();

  const [trainerEmail, setTrainerEmail] = useState("");
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [trainerTeams, setTrainerTeams] = useState<{ id: number; name: string }[]>([]);
  const [searchingTrainer, setSearchingTrainer] = useState(false);
  const [, setSelectedTeamId] = useState<number | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedScheduleMatch, setSelectedScheduleMatch] = useState<any>(null);
  const [needsRestructure, setNeedsRestructure] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState("");
  const [matchTime, setMatchTime] = useState("20:00");
  const [daysBetweenRounds, setDaysBetweenRounds] = useState(7);

  const { data: league, isLoading } = useQuery({
    queryKey: ["league", id],
    queryFn: () => getLeagueById(id),
    enabled: Number.isInteger(id),
  });

  const { data: fixture, isLoading: loadingFixture } = useQuery({
    queryKey: ["fixture", id],
    queryFn: () => getFixture(id),
    enabled: Number.isInteger(id),
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
      queryClient.invalidateQueries({ queryKey: ["league", id] });
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
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixture", id] });
      toast.success("Fixture generado");
      setNeedsRestructure(false)
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

  if (isLoading || !league) {
    return (
      <div className="py-8 text-center text-[var(--geo-text-muted)]">
        Cargando liga…
      </div>
    );
  }

  const teams = league.teams || [];

  return (
    <div>
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

      <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6">
        <h2 className="flex items-center gap-2 font-bold text-[var(--geo-text)]">
          <TrophyIcon className="h-5 w-5 text-geo-green" />
          Logo de la liga
        </h2>
        <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
          Próximamente podrás subir el logo de la liga desde aquí.
        </p>
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
          <ul className="mt-4 space-y-2">
            {teams.map((team) => (
              <li
                key={team.id}
                className="flex items-center justify-between rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3"
              >
                <span className="font-medium text-[var(--geo-text)]">{team.name}</span>
                <button
                  type="button"
                  onClick={() => removeTeamMutation.mutate(team.id)}
                  className="text-red-500 hover:text-red-400"
                  title="Quitar de la liga"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
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
            </div>
            {loadingFixture ? (
              <p className="mt-4 text-[var(--geo-text-muted)]">Cargando fixture…</p>
            ) : fixture && Object.keys(fixture).length > 0 ? (
              <div className="mt-6 space-y-4">
                {Object.entries(fixture).map(([round, matches]) => (
                  <div key={round}>
                    <h3 className="font-semibold text-geo-green">{round}</h3>
                    <ul className="mt-2 space-y-2">
                      {(matches as any[]).map((m: any) => (
                        <li
                          key={m.id}
                          className="flex items-center justify-between rounded border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm"
                        >
                          <div className="flex-1">
                            <span className="text-[var(--geo-text)]">
                              {m.homeTeam?.name ?? "Local"} vs {m.awayTeam?.name ?? "Visitante"}
                            </span>
                          </div>

                          <div className="flex items-center gap-4">
                            {/* Mostramos el marcador actual si ya se jugó */}
                            {m.played ? (
                               <span className="font-mono text-geo-green font-bold">
                                 {m.homeScore} - {m.awayScore}
                               </span>
                            ) : (
                               <span className="text-zinc-500 text-xs italic">Pendiente</span>
                            )}

                            {/* NUEVO: Botón para abrir el modal y actualizar el resultado */}
                            <button
                              onClick={() => setSelectedMatch(m)}
                              className="text-zinc-400 hover:text-geo-green transition-colors"
                              title="Actualizar Resultado"
                            >
                              <PencilSquareIcon className="h-5 w-5" />
                            </button>

                            <button
                              onClick={() => {
                                if (m.date && new Date(m.date).getTime() < Date.now()) return;
                                setSelectedScheduleMatch(m);
                              }}
                              className="text-zinc-400 hover:text-geo-green transition-colors"
                              title={m.date && new Date(m.date).getTime() < Date.now() ? "Partido vencido: no editable" : "Programar fecha/hora"}
                            >
                              <CalendarDaysIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
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
