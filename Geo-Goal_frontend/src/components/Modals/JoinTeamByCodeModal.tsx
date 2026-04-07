import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { teamInvitationAPI } from '@/api/invitationAPI';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

interface JoinTeamByCodeModalProps {
  onPlayerAdded?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export function JoinTeamByCodeModal({
  onPlayerAdded,
  isOpen,
  onClose,
}: JoinTeamByCodeModalProps) {
  const [code, setCode] = useState('');

  const { mutate: joinTeam, isPending } = useMutation({
    mutationFn: () => teamInvitationAPI.joinByCode(code),
    onSuccess: () => {
      setCode('');
      toast.success('¡Te uniste al equipo exitosamente!');
      onPlayerAdded?.();
      onClose();
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Error al unirse al equipo'));
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[var(--geo-text)]">
          Unir a Equipo
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
              placeholder="Ej: XYZ789AB"
              className="input-pitch w-full uppercase tracking-widest text-center text-2xl"
              maxLength={8}
            />
          </div>

          <button
            onClick={() => joinTeam()}
            disabled={isPending || !code}
            className="btn-pitch w-full py-3 disabled:opacity-60"
          >
            {isPending ? 'Uniéndose...' : 'Unir a Equipo'}
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
