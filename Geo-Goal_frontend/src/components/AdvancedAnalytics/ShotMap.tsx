/**
 * ShotMap — Fase 5.D
 * Mapa de tiros SVG con tamaño proporcional al xG.
 * Verde = gol, Amarillo = a puerta, Rojo = fuera.
 */

// Tipo local para evitar problemas de caché del IDE con publicAPI
interface XGShot { playerId: number | null; teamId: number | null; eventType: string; x: number; y: number; xg: number; outcome: string; minute: number }


interface Props {
  shots: XGShot[];
  /** Nombre del equipo local (ataca hacia la derecha del SVG) */
  homeName?: string;
  /** Nombre del equipo visitante */
  awayName?: string;
  /** teamId del equipo local para colorear diferente */
  homeTeamId?: number;
}

const OUTCOME_COLOR: Record<string, string> = {
  goal: "#10b981",       // verde
  on_target: "#facc15", // amarillo
  missed: "#ef4444",    // rojo
};

export function ShotMap({ shots, homeName, awayName, homeTeamId }: Props) {
  if (!shots.length) {
    return (
      <p className="py-4 text-center text-xs text-[var(--geo-text-muted)]">
        Sin tiros registrados para este partido.
      </p>
    );
  }

  // Calcular xG totales
  const homeShots = shots.filter((s) => s.teamId === homeTeamId);
  const awayShots = shots.filter((s) => s.teamId !== homeTeamId || homeTeamId == null);
  const homeXG = homeShots.reduce((a, s) => a + s.xg, 0);
  const awayXG = awayShots.reduce((a, s) => a + s.xg, 0);

  return (
    <div className="space-y-2">
      {/* Encabezado xG total */}
      <div className="flex justify-between text-xs font-bold text-[var(--geo-text-muted)]">
        <span className="text-blue-400">{homeName ?? "Local"} xG: {homeXG.toFixed(2)}</span>
        <span className="text-orange-400">{awayName ?? "Visitante"} xG: {awayXG.toFixed(2)}</span>
      </div>

      {/* Campo-medio (vista cenital simplificada) */}
      <svg
        viewBox="0 0 100 65"
        className="w-full rounded-lg border border-white/10 bg-emerald-950/60"
        style={{ aspectRatio: "100/65" }}
        aria-label="Mapa de tiros"
      >
        {/* Líneas de campo */}
        <rect x="0" y="0" width="100" height="65" fill="none" stroke="white" strokeOpacity={0.15} strokeWidth={0.4} />
        {/* Línea de medio campo */}
        <line x1="50" y1="0" x2="50" y2="65" stroke="white" strokeOpacity={0.15} strokeWidth={0.4} />
        {/* Círculo central */}
        <circle cx="50" cy="32.5" r="9" fill="none" stroke="white" strokeOpacity={0.15} strokeWidth={0.4} />
        {/* Área grande derecha */}
        <rect x="83.5" y="13.5" width="16.5" height="38" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={0.4} />
        {/* Área pequeña derecha */}
        <rect x="94.5" y="24" width="5.5" height="17" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={0.4} />
        {/* Portería derecha */}
        <rect x="99.5" y="27.5" width="0.5" height="10" fill="white" opacity={0.4} />
        {/* Área grande izquierda */}
        <rect x="0" y="13.5" width="16.5" height="38" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={0.4} />
        {/* Área pequeña izquierda */}
        <rect x="0" y="24" width="5.5" height="17" fill="none" stroke="white" strokeOpacity={0.2} strokeWidth={0.4} />
        {/* Portería izquierda */}
        <rect x="0" y="27.5" width="0.5" height="10" fill="white" opacity={0.4} />

        {/* Tiros */}
        {shots.map((s, i) => {
          // Normalizar: coords 0-100 del backend → SVG viewBox 0-100 × 0-65
          const cx = s.x;
          const cy = (s.y / 100) * 65;
          const r = Math.max(1.5, Math.min(6, 2 + s.xg * 18));
          const color = OUTCOME_COLOR[s.outcome] ?? "#ef4444";
          const isHome = s.teamId === homeTeamId;

          return (
            <g key={i}>
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={color}
                opacity={0.75}
                stroke={isHome ? "#60a5fa" : "#fb923c"}
                strokeWidth={0.6}
              >
                <title>{`${isHome ? homeName ?? "Local" : awayName ?? "Visitante"} · min ${s.minute} · xG ${(s.xg * 100).toFixed(0)}% · ${s.outcome}`}</title>
              </circle>
              {/* Cruz si fue gol */}
              {s.outcome === "goal" && (
                <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" fontSize={r * 1.2} fill="white" style={{ pointerEvents: "none", userSelect: "none" }}>
                  ⚽
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Leyenda */}
      <div className="flex gap-4 text-[10px] text-[var(--geo-text-muted)]">
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#10b981]" /> Gol</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#facc15]" /> A puerta</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ef4444]" /> Fuera</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border border-blue-400" /> Local</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full border border-orange-400" /> Visitante</span>
        <span className="ml-auto">Tamaño ∝ xG</span>
      </div>
    </div>
  );
}

export default ShotMap;


