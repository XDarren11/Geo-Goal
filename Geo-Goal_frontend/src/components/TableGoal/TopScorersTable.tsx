import { useQuery } from "@tanstack/react-query";
import { getTopScorers } from "@/api/publicAPI";

type TopScorer = {
    playerId: number;
    totalGoals: number;
    playerName: string;
    teamName: string;
};

export default function TopScorersTable({ leagueId }: { leagueId: number }) {
  const { data: scorers, isLoading } = useQuery<TopScorer[]>({
    queryKey: ["topScorers", leagueId],
    queryFn: () => getTopScorers(leagueId),
    enabled: !!leagueId,
  });

  if (isLoading) {
    return (
      <div className="text-[var(--geo-text-muted)] p-4">
        Cargando goleadores...
      </div>
    );
  }

  if (!scorers?.length) {
    return (
      <div className="text-[var(--geo-text-muted)] p-4">
        Aún no hay goles registrados.
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {scorers.map((scorer, index) => (
    <div
        key={scorer.playerId ?? index}
        className="flex items-center justify-between rounded-xl bg-[var(--geo-bg-card)] p-4 border border-[var(--geo-border)]"
    >
        <div className="flex items-center gap-4">
        <span className="w-8 h-8 flex items-center justify-center rounded-full bg-geo-green/20 font-bold text-geo-green">
            {index + 1}
        </span>

        <div>
            <p className="font-bold text-[var(--geo-text)]">
            {scorer.playerName || "Jugador desconocido"}
            </p>

            <p className="text-sm text-[var(--geo-text-muted)]">
            {scorer.teamName || "Sin equipo"}
            </p>
        </div>
        </div>

        <div className="text-right">
        <p className="font-geo text-2xl text-geo-green">
            {scorer.totalGoals}
        </p>

        <p className="text-[10px] uppercase tracking-widest text-[var(--geo-text-muted)]">
            Goles
        </p>
        </div>
    </div>
    ))}
    </div>
  );
}