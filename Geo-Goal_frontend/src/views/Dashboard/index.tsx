import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { Role } from "@/types";
import {
  TrophyIcon,
  UserGroupIcon,
  PlusCircleIcon,
  KeyIcon,
  DocumentTextIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";

const cardClass = "card-pitch flex items-center gap-4 p-5 opacity-0 animate-in-up";

export default function DashboardView() {
  const { data: user } = useAuth();
  const role = (user?.role as Role) || "player";

  return (
    <div className="min-h-full w-full">
      <h1 className="font-geo text-4xl lg:text-5xl tracking-wide text-[var(--geo-text)] opacity-0 animate-in-up">
        Hola, {user?.name}
      </h1>
      <p className="mt-3 text-lg text-[var(--geo-text-muted)] opacity-0 animate-in-up stagger-1">
        {role === "admin" && "Administra tus ligas y equipos."}
        {role === "coach" && "Gestiona tus equipos y únete a ligas."}
        {role === "player" && "Revisa tus equipos, resultados y noticias."}
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {role === "admin" && (
          <>
            <Link to="/leagues" className={`${cardClass} stagger-2`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5 transition-transform duration-200 group-hover:scale-110">
                <TrophyIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Mis ligas</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Ver y administrar ligas</p>
              </div>
            </Link>
            <Link to="/leagues/new" className={`${cardClass} stagger-3`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <PlusCircleIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Crear liga</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Nueva liga y logo</p>
              </div>
            </Link>
            <Link to="/leagues/admins" className={`${cardClass} stagger-4`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <UserGroupIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Administradores</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Gestionar admins de liga</p>
              </div>
            </Link>
          </>
        )}

        {role === "coach" && (
          <>
            <Link to="/leagues/join" className={`${cardClass} stagger-2`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <KeyIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Mis liga</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Vizualiza las ligas</p>
              </div>
            </Link>
            <Link to="/teams" className={`${cardClass} stagger-3`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <TrophyIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Mis equipos</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Ver y crear equipos</p>
              </div>
            </Link>
            <Link to="/teams/new" className={`${cardClass} stagger-4`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <PlusCircleIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Crear equipo</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Registrar nuevo equipo</p>
              </div>
            </Link>
          </>
        )}

        {role === "player" && (
          <>
            <Link to="/teams/join" className={`${cardClass} stagger-2`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <KeyIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Unirse a equipo</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Con código del entrenador</p>
              </div>
            </Link>
            <Link to="/my-teams" className={`${cardClass} stagger-3`}>
              <div className="rounded-xl bg-geo-green/20 p-3.5">
                <UserGroupIcon className="h-8 w-8 text-geo-green" />
              </div>
              <div>
                <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Mis equipos</h2>
                <p className="text-sm text-[var(--geo-text-muted)]">Equipos donde juego</p>
              </div>
            </Link>
          </>
        )}

        <Link
          to="/standings"
          className={`${cardClass} ${role === "player" ? "stagger-3" : "stagger-5"}`}
        >
          <div className="rounded-xl bg-geo-green/20 p-3.5">
            <ChartBarIcon className="h-8 w-8 text-geo-green" />
          </div>
          <div>
            <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Tabla de posiciones</h2>
            <p className="text-sm text-[var(--geo-text-muted)]">Ver clasificación</p>
          </div>
        </Link>
        <Link
          to="/results"
          className={`${cardClass} ${role === "player" ? "stagger-4" : "stagger-6"}`}
        >
          <div className="rounded-xl bg-geo-green/20 p-3.5">
            <TrophyIcon className="h-8 w-8 text-geo-green" />
          </div>
          <div>
            <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Resultados</h2>
            <p className="text-sm text-[var(--geo-text-muted)]">Partidos y resultados</p>
          </div>
        </Link>
        <Link
          to="/news"
          className={`${cardClass} ${role === "player" ? "stagger-5" : "stagger-7"}`}
        >
          <div className="rounded-xl bg-geo-green/20 p-3.5">
            <DocumentTextIcon className="h-8 w-8 text-geo-green" />
          </div>
          <div>
            <h2 className="font-geo text-xl tracking-wide text-[var(--geo-text)]">Noticias</h2>
            <p className="text-sm text-[var(--geo-text-muted)]">Novedades de la liga</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
