import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { KeyIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { useAuth } from '@/hooks/useAuth';
import { getMyTeams } from '@/api/teamAPI';
import { leagueInvitationAPI } from '@/api/invitationAPI';
import ErrorMessage from '@/components/ErrorMessage';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export default function JoinLeagueView() {
  const navigate = useNavigate();
  const { data: currentUser, isLoading: loadingUser } = useAuth();
  const isReferee = currentUser?.role === 'referee';
  const [code, setCode] = useState('');
  const [teamId, setTeamId] = useState('');
  const [localError, setLocalError] = useState('');

  const { data: teams = [], isLoading: loadingTeams } = useQuery({
    queryKey: ['my-teams', currentUser?.id],
    queryFn: getMyTeams,
    enabled: !!currentUser?.id && !isReferee,
  });

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === teamId),
    [teamId, teams]
  );

  const { mutate: joinLeague, isPending } = useMutation({
    mutationFn: () =>
      leagueInvitationAPI.joinByCode(
        code.trim().toUpperCase(),
        isReferee ? undefined : Number(teamId)
      ),
    onSuccess: () => {
      toast.success(isReferee ? 'Te uniste a la liga como árbitro' : 'Tu equipo se unió a la liga correctamente');
      navigate('/dashboard');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'No se pudo unir a la liga'));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');

    if (!code.trim()) {
      setLocalError('El código es obligatorio');
      return;
    }

    if (!isReferee && !teamId) {
      setLocalError('Debes seleccionar tu equipo');
      return;
    }

    joinLeague();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Volver al inicio
      </Link>

      <div className="mt-4 rounded-3xl border border-geo-green/40 bg-[var(--geo-bg-card)] p-8 shadow-[0_0_0_1px_rgba(57,255,20,0.08),0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="flex items-center gap-3">
          <TrophyIcon className="h-9 w-9 text-geo-green" />
          <div>
            <h1 className="text-3xl font-black text-[var(--geo-text)]">Ingresar código de liga</h1>
            <p className="mt-1 text-[var(--geo-text-muted)]">
              Ingresa el código que te compartió el administrador.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {(loadingUser || (!isReferee && loadingTeams)) && (
            <p className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-sm text-[var(--geo-text-muted)]">
              {isReferee ? 'Cargando datos del árbitro…' : 'Cargando datos del entrenador…'}
            </p>
          )}

          <div>
            <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
              <KeyIcon className="h-5 w-5 text-geo-green" />
              Código de la liga
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ABC123XY"
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 font-mono text-lg tracking-[0.35em] text-[var(--geo-text)] uppercase placeholder:tracking-normal focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              maxLength={8}
              disabled={loadingUser || loadingTeams}
            />
            {localError && <ErrorMessage>{localError}</ErrorMessage>}
          </div>

          {!isReferee && (
          <div>
            <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
              <UserGroupIcon className="h-5 w-5 text-geo-green" />
              Selecciona tu equipo
            </label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              disabled={loadingUser || loadingTeams}
            >
              <option value="">Selecciona un equipo</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
            {!selectedTeam && teams.length === 0 && (
              <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
                Primero debes crear un equipo para poder unirte a una liga con código.
              </p>
            )}
          </div>
          )}

          <button
            type="submit"
            disabled={
              isPending ||
              loadingUser ||
              (!isReferee && (loadingTeams || teams.length === 0))
            }
            className="w-full rounded-xl bg-geo-green py-3.5 font-bold text-geo-black transition-colors hover:bg-geo-green-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (isReferee ? 'Uniéndote…' : 'Uniendo equipo…') : 'Unir a liga'}
          </button>
        </form>
      </div>
    </div>
  );
}