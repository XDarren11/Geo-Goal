import { useState } from 'react';
import { TeamInvitationCodeModal } from '@/components/Modals/TeamInvitationCodeModal';

interface TeamInvitationMenuProps {
  teamId: number;
  userIsTrainer?: boolean;
}

export function TeamInvitationMenu({
  teamId,
  userIsTrainer = false,
}: TeamInvitationMenuProps) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  if (!userIsTrainer) return null;

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 rounded-lg bg-geo-green/10 px-4 py-2 text-geo-green transition-colors hover:bg-geo-green/20"
        >
          <span className="text-lg">🔗</span>
          Generar código
        </button>
      </div>

      <TeamInvitationCodeModal
        teamId={teamId}
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
      />
    </>
  );
}
