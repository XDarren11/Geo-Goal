import { useEffect, useRef } from "react";

interface PlayerHeatmapProps {
  grid: number[][];
  width?: number;
  height?: number;
}

function heatColor(v: number): [number, number, number] {
  // 0 → verde oscuro, 0.5 → amarillo, 1 → rojo
  if (v < 0.5) {
    return [Math.round(v * 2 * 255), 255, 0];
  }
  return [255, Math.round((1 - v) * 2 * 255), 0];
}

export function PlayerHeatmap({ grid, width = 420, height = 270 }: PlayerHeatmapProps) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !grid?.length || !grid[0]?.length) return;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo verde de cancha
    ctx.fillStyle = "#14532d";
    ctx.fillRect(0, 0, width, height);

    const rows = grid.length;
    const cols = grid[0].length;
    const cellW = width / cols;
    const cellH = height / rows;

    // Pintar celdas con color de calor
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const v = grid[gy][gx];
        if (v < 0.04) continue;
        const [r, g, b] = heatColor(v);
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.9, v * 1.3)})`;
        ctx.fillRect(gx * cellW, gy * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Líneas de la cancha encima (sutiles)
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    // Línea central vertical
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    // Borde
    ctx.strokeRect(0, 0, width, height);
  }, [grid, width, height]);

  return (
    <canvas
      ref={ref}
      className="w-full rounded-lg"
      style={{ aspectRatio: `${width}/${height}` }}
    />
  );
}

