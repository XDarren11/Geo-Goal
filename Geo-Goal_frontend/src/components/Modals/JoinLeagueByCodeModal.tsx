import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { leagueInvitationAPI } from '@/api/invitationAPI';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

interface JoinLeagueByCodeModalProps {
  onTeamAdded?: () => void;
  isOpen: boolean;
  onClose: () => void;
  teamId?: number;
  availableTeams?: Array<{ id: number; name: string }>;
}

export function JoinLeagueByCodeModal({
  onTeamAdded,
  isOpen,
  onClose,
  teamId: initialTeamId,
  availableTeams = [],
}: JoinLeagueByCodeModalProps) {
  const [code, setCode] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState(
    initialTeamId?.toString() || ''
  );

  useEffect(() => {
    if (initialTeamId) {
      setSelectedTeamId(initialTeamId.toString());
      return;
    }

    if (availableTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(String(availableTeams[0].id));
    }
  }, [initialTeamId, availableTeams, selectedTeamId]);

  const { mutate: joinLeague, isPending } = useMutation({
    mutationFn: () =>
      leagueInvitationAPI.joinByCode(code.trim().toUpperCase(), Number(selectedTeamId)),
    onSuccess: () => {
      setCode('');
      setSelectedTeamId(initialTeamId?.toString() || '');
      toast.success('¡Equipo unido a la liga exitosamente!');
      onTeamAdded?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Error al unirse a la liga'));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[var(--geo-text)]">
          Unir Equipo a Liga
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-[var(--geo-text)]">
              Código de Invitación
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Ej: ABC123XY"
              className="input-pitch w-full uppercase tracking-widest"
              maxLength={8}
            />
          </div>

          {!initialTeamId && availableTeams.length > 0 && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-[var(--geo-text)]">
                Selecciona tu Equipo
              </label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="input-pitch w-full"
              >
                <option value="">-- Selecciona un equipo --</option>
                {availableTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {availableTeams.length === 0 && (
            <p className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2 text-sm text-[var(--geo-text-muted)]">
              No tienes equipos disponibles. Crea uno primero para usar este código.
            </p>
          )}

          <button
            onClick={() => joinLeague()}
            disabled={isPending || !code.trim() || !selectedTeamId || availableTeams.length === 0}
            className="btn-pitch w-full py-3 disabled:opacity-60"
          >
            {isPending ? 'Uniéndose...' : 'Unir a Liga'}
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
