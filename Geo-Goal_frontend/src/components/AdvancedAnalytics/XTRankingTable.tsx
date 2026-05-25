/**
 * XTRankingTable — Fase 5.D
 * Tabla de "creadores de peligro" ordenada por xT ganado.
 */

// Tipos locales para evitar problemas de caché del IDE con publicAPI
interface XTTopPass { playerId: number; teamId: number | null; xtDelta: number }
interface XTResponse { perPlayer: Record<number, number>; perTeam: Record<number, number>; topPasses: XTTopPass[] }

interface Props {
  xt: XTResponse;
  playerNames: Record<number, string>;
  homeName?: string;
  awayName?: string;
  homeTeamId?: number;
}

export function XTRankingTable({ xt, playerNames, homeName, awayName, homeTeamId }: Props) {
  // Construir ranking de jugadores
  const ranking: Array<{ playerId: number; value: number }> = Object.entries(xt.perPlayer)
    .map(([playerId, value]) => ({ playerId: Number(playerId), value: Number(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Obtener teamId del jugador desde topPasses (mejor que nada)
  const playerTeam = new Map<number, number | null>();
  xt.topPasses.forEach((p: XTTopPass) => playerTeam.set(p.playerId, p.teamId));

  if (!ranking.length) {
    return (
      <p className="py-2 text-center text-xs text-[var(--geo-text-muted)]">
        Sin datos de xT disponibles (se necesitan pases con coordenadas).
      </p>
    );
  }

  const maxValue = ranking[0].value;

  return (
    <div className="space-y-1">
      {/* xT por equipo */}
      {Object.keys(xt.perTeam).length > 0 && (
        <div className="mb-3 flex gap-4 text-xs text-[var(--geo-text-muted)]">
          {Object.entries(xt.perTeam).map(([teamId, val]) => {
            const isHome = Number(teamId) === homeTeamId;
            return (
              <span key={teamId} className={isHome ? "text-blue-400" : "text-orange-400"}>
                {isHome ? (homeName ?? "Local") : (awayName ?? "Visitante")}: {Number(val).toFixed(3)} xT
              </span>
            );
          })}
        </div>
      )}

      {ranking.map((row, idx) => {
        const name = playerNames[row.playerId] ?? `Jugador ${row.playerId}`;
        const teamId = playerTeam.get(row.playerId) ?? null;
        const isHome = teamId === homeTeamId;
        const pct = maxValue > 0 ? (row.value / maxValue) * 100 : 0;

        return (
          <div key={row.playerId} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-right font-mono text-[var(--geo-text-muted)]">{idx + 1}</span>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isHome ? "bg-blue-400" : "bg-orange-400"}`} />
            <span className="w-32 truncate font-semibold text-[var(--geo-text)]">{name}</span>
            <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-geo-green/70 transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[var(--geo-text)]">+{row.value.toFixed(4)}</span>
          </div>
        );
      })}
    </div>
  );
}
