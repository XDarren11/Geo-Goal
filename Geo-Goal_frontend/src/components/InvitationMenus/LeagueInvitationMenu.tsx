import { useState } from 'react';
import { LeagueInvitationCodeModal } from '@/components/Modals/LeagueInvitationCodeModal';

interface LeagueInvitationMenuProps {
  leagueId: number;
  userIsManager?: boolean;
}

export function LeagueInvitationMenu({
  leagueId,
  userIsManager = false,
}: LeagueInvitationMenuProps) {
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  if (!userIsManager) return null;

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

      <LeagueInvitationCodeModal
        leagueId={leagueId}
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
      />
    </>
  );
}
