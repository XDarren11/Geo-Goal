import { Link } from "react-router-dom";
import { UserGroupIcon } from "@heroicons/react/24/outline";

export default function MyTeamsView() {
  return (
    <div>
      <Link
        to="/"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green"
      >
        ← Inicio
      </Link>
      <h1 className="mt-4 text-3xl font-black text-[var(--geo-text)]">
        Mis equipos
      </h1>
      <p className="mt-2 text-[var(--geo-text-muted)]">
        Equipos en los que estás inscrito como jugador.
      </p>
      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center">
        <UserGroupIcon className="mx-auto h-12 w-12 text-geo-green" />
        <p className="mt-4 text-[var(--geo-text-muted)]">
          Primero únete a un equipo con el código que te dio tu entrenador.
        </p>
        <Link
          to="/teams/join"
          className="mt-4 inline-block rounded-lg bg-geo-green px-6 py-2 font-bold text-geo-black hover:bg-geo-green-hover"
        >
          Unirse a un equipo
        </Link>
      </div>
    </div>
  );
}
