import { Link } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default function LeagueAdminsView() {
  return (
    <div>
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Administradores de liga
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Gestiona quién puede administrar cada liga. Esta función estará disponible cuando el backend lo soporte.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
        <UserGroupIcon className="mx-auto h-12 w-12 text-geo-green" />
        <p className="mt-4 text-[var(--geo-text-muted)]">
          Próximamente: agregar y quitar administradores por liga.
        </p>
      </div>
    </div>
  );
}
