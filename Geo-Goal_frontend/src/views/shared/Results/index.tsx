import { Link } from "react-router-dom";
import { TrophyIcon } from "@heroicons/react/24/outline";

export default function ResultsView() {
  return (
    <div>
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Resultados
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Resultados de partidos por liga. Entra a una liga para ver su calendario y marcadores.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
        <TrophyIcon className="mx-auto h-12 w-12 text-geo-green" />
        <p className="mt-4 text-[var(--geo-text-muted)]">
          Los resultados se muestran en el detalle de cada liga (Admin) o cuando estén disponibles por liga.
        </p>
        <Link
          to="/leagues"
          className="mt-4 inline-block rounded-lg border border-geo-green px-6 py-2 font-bold text-geo-green hover:bg-geo-green/10"
        >
          Ver ligas
        </Link>
      </div>
    </div>
  );
}
