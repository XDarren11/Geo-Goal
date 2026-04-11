import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { KeyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import ErrorMessage from '@/components/ErrorMessage';
import { teamInvitationAPI } from '@/api/invitationAPI';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

export default function JoinTeamView() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [localError, setLocalError] = useState('');

  const { mutate: joinTeam, isPending } = useMutation({
    mutationFn: () => teamInvitationAPI.joinByCode({
      code: code.trim().toUpperCase(),
      playerName: playerName.trim(),
      jerseyNumber: Number(jerseyNumber),
    }),
    onSuccess: () => {
      toast.success('Te uniste al equipo correctamente');
      navigate('/my-teams');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'No se pudo unir al equipo'));
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError('');

    if (!code.trim()) {
      setLocalError('El código es obligatorio');
      return;
    }

    if (!playerName.trim()) {
      setLocalError('El nombre de jugador es obligatorio');
      return;
    }

    const parsedJersey = Number(jerseyNumber);
    if (!Number.isInteger(parsedJersey) || parsedJersey < 1 || parsedJersey > 99) {
      setLocalError('El dorsal debe ser un número entre 1 y 99');
      return;
    }

    joinTeam();
  };

  return (
    <div className="mx-auto max-w-xl">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Volver al inicio
      </Link>

      <div className="mt-4 rounded-3xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 shadow-lg">
        <div className="flex items-center gap-3">
          <UserGroupIcon className="h-9 w-9 text-geo-green" />
          <div>
            <h1 className="text-3xl font-black text-[var(--geo-text)]">Unirme a un equipo</h1>
            <p className="mt-1 text-[var(--geo-text-muted)]">
              Ingresa el código que te compartió tu entrenador.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
              Nombre de jugador
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Ej. Mohamed Salah"
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              maxLength={80}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
              Dorsal
            </label>
            <input
              type="number"
              value={jerseyNumber}
              onChange={(e) => setJerseyNumber(e.target.value)}
              placeholder="10"
              min={1}
              max={99}
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 text-[var(--geo-text)] focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 font-semibold text-[var(--geo-text)]">
              <KeyIcon className="h-5 w-5 text-geo-green" />
              Código del equipo
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XYZ789AB"
              className="mt-2 w-full rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] px-4 py-3 font-mono text-lg tracking-[0.35em] text-[var(--geo-text)] uppercase placeholder:tracking-normal focus:border-geo-green focus:outline-none focus:ring-1 focus:ring-geo-green"
              maxLength={8}
            />
            {localError && <ErrorMessage>{localError}</ErrorMessage>}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-xl bg-geo-green py-3.5 font-bold text-geo-black transition-colors hover:bg-geo-green-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Uniéndote…' : 'Unirme al equipo'}
          </button>
        </form>
      </div>
    </div>
  );
}
