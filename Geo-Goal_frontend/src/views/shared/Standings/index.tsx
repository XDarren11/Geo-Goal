import { Link } from "react-router-dom";
import { ChartBarIcon } from "@heroicons/react/24/outline";

export default function StandingsView() {
  return (
    <div>
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Tabla de posiciones
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Clasificación por liga. Próximamente cuando el backend calcule puntos.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
        <ChartBarIcon className="mx-auto h-12 w-12 text-geo-green" />
        <p className="mt-4 text-[var(--geo-text-muted)]">
          Aquí verás la tabla de posiciones por liga.
        </p>
      </div>
    </div>
  );
}
