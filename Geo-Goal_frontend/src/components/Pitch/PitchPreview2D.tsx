/**
 * PitchPreview2D — Cancha 2D de solo lectura (Fase 1) / con asignación (Fase 2).
 *
 * Recibe detecciones en metros (x_m, y_m) y las proyecta porcentualmente
 * sobre una cancha SVG/CSS para validar la homografía visualmente.
 *
 * Props opcionales de Fase 2:
 *   identityMap     — tracker_id → userId ya asignado
 *   rosterById      — userId → { name, number, side }
 *   onSelectDetection / selectedTrackerId — click-and-select para asignar identidad
 */

import type { PreviewDetection, PreviewBall } from "../../api/publicAPI";

interface RosterEntry {
  name: string;
  number: number | null;
  side: "home" | "away";
}

interface Props {
  pitch: { length_m: number; width_m: number };
  detections: PreviewDetection[];
  ball: PreviewBall | null;
  /** Fase 2: tracker_id → userId */
  identityMap?: Record<number, number>;
  /** Fase 2: userId → datos del jugador */
  rosterById?: Map<number, RosterEntry>;
  /** Fase 2: callback cuando el admin selecciona una detección */
  onSelectDetection?: (trackerId: number) => void;
  /** Fase 2: tracker_id actualmente seleccionado */
  selectedTrackerId?: number | null;
}

const TEAM_COLOR: Record<string, string> = {
  home: "#22c55e",
  away: "#38bdf8",
  referee: "#facc15",
  unknown: "#94a3b8",
};

export function PitchPreview2D({
  pitch,
  detections,
  ball,
  identityMap,
  rosterById,
  onSelectDetection,
  selectedTrackerId,
}: Props) {
  /** Convierte metros (eje largo) a porcentaje horizontal */
  const toLeft = (x_m: number) =>
    `${Math.min(100, Math.max(0, (x_m / pitch.length_m) * 100))}%`;

  /** Convierte metros (eje ancho) a porcentaje vertical */
  const toTop = (y_m: number) =>
    `${Math.min(100, Math.max(0, (y_m / pitch.width_m) * 100))}%`;

  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-xl border border-emerald-400/40 bg-gradient-to-b from-emerald-800/70 to-emerald-900/80">
      {/* ── Líneas de cancha ── */}
      {/* Borde interior */}
      <div className="absolute inset-2 rounded-lg border border-white/30" />
      {/* Línea de medio */}
      <div className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2 bg-white/40" />
      {/* Círculo central */}
      <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40" />
      {/* Área izquierda */}
      <div className="absolute left-2 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-l-0" />
      {/* Área derecha */}
      <div className="absolute right-2 top-1/2 h-40 w-16 -translate-y-1/2 border border-white/40 border-r-0" />

      {/* ── Detecciones de jugadores ── */}
      {detections.map((d) => {
        const userId = identityMap?.[d.tracker_id];
        const roster = userId ? rosterById?.get(userId) : null;
        const isSelected = selectedTrackerId === d.tracker_id;
        const color = TEAM_COLOR[d.team] ?? TEAM_COLOR.unknown;
        const textColor = d.team === "referee" ? "#000" : "#fff";

        return (
          <button
            key={d.tracker_id}
            type="button"
            onClick={() => onSelectDetection?.(d.tracker_id)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
              isSelected ? "z-10 scale-125" : "hover:scale-110"
            }`}
            style={{ left: toLeft(d.x_m), top: toTop(d.y_m) }}
            title={`Tracker #${d.tracker_id} · ${d.team}${roster ? ` · ${roster.name}` : ""}`}
          >
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-black shadow-lg ${
                isSelected ? "border-white" : "border-black/40"
              }`}
              style={{ backgroundColor: color, color: textColor }}
            >
              {/* Muestra número del jugador si está asignado, si no el tracker_id */}
              {roster?.number ?? d.tracker_id}
            </div>
            {/* Nombre del jugador (solo si tiene identidad asignada) */}
            {roster?.name && (
              <p className="mt-0.5 max-w-[80px] truncate text-center text-[9px] font-semibold text-white drop-shadow">
                {roster.name}
              </p>
            )}
          </button>
        );
      })}

      {/* ── Balón ── */}
      {ball && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: toLeft(ball.x_m), top: toTop(ball.y_m) }}
        >
          <div className="h-4 w-4 rounded-full border-2 border-black bg-white shadow" />
        </div>
      )}

      {/* ── Leyenda ── */}
      <div className="absolute bottom-2 left-2 flex gap-2 text-[10px] font-bold">
        <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-[#22c55e]" />
          Local
        </span>
        <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-[#38bdf8]" />
          Visitante
        </span>
        <span className="flex items-center gap-1 rounded bg-black/40 px-2 py-1 text-white">
          <span className="inline-block h-2 w-2 rounded-full bg-[#facc15]" />
          Árbitro
        </span>
      </div>

      {/* ── Contador de detecciones (esquina superior derecha) ── */}
      <div className="absolute right-2 top-2 rounded bg-black/40 px-2 py-1 text-[10px] text-white/70">
        {detections.length} jugadores{ball ? " + balón" : ""}
      </div>
    </div>
  );
}

