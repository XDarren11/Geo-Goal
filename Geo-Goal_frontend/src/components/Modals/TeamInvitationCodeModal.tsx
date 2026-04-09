import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { teamInvitationAPI } from '@/api/invitationAPI';
import { toast } from 'react-toastify';
import { getApiErrorMessage } from '@/utils/getApiErrorMessage';

interface InvitationCodeModalProps {
  teamId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function TeamInvitationCodeModal({
  teamId,
  isOpen,
  onClose,
}: InvitationCodeModalProps) {
  const [code, setCode] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { mutate: generateCode, isPending } = useMutation({
    mutationFn: () => teamInvitationAPI.generateCode(teamId),
    onSuccess: (data) => {
      setCode(data.code);
      toast.success('Código generado exitosamente');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Error al generar código'));
    },
  });

  const { mutate: revokeCode, isPending: isRevoking } = useMutation({
    mutationFn: () => teamInvitationAPI.revokeCode(teamId),
    onSuccess: () => {
      setCode('');
      setCopied(false);
      toast.success('Código revocado');
    },
    onError: (error: any) => {
      toast.error(getApiErrorMessage(error, 'Error al revocar'));
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-[var(--geo-text)]">
          Código de Invitación del Equipo
        </h2>

        <div className="space-y-4">
          {!code ? (
            <button
              onClick={() => generateCode()}
              disabled={isPending}
              className="btn-pitch w-full py-3 disabled:opacity-60"
            >
              {isPending ? 'Generando...' : 'Generar Código'}
            </button>
          ) : (
            <>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center">
                <p className="text-sm text-[var(--geo-text-muted)] mb-2">
                  Comparte este código con tus jugadores:
                </p>
                <p className="text-3xl font-bold font-mono text-geo-green tracking-widest">
                  {code}
                </p>
              </div>

              <button
                onClick={handleCopy}
                className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-[var(--geo-text)] py-2 rounded-lg transition-colors"
              >
                {copied ? '✓ Copiado' : 'Copiar Código'}
              </button>

              <button
                onClick={() => revokeCode()}
                disabled={isRevoking}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-600 py-2 rounded-lg transition-colors disabled:opacity-60"
              >
                {isRevoking ? 'Revocando...' : 'Revocar Código'}
              </button>
            </>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
