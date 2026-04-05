import { Fragment } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Bars3Icon } from "@heroicons/react/20/solid";
import { Link } from "react-router-dom";
import type { User, Role } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

type NavMenuProps = { name: User["name"]; role?: string };

export default function NavMenu({ name, role }: NavMenuProps) {
  const queryClient = useQueryClient();
  const r = (role as Role) || "player";

  const logout = () => {
    localStorage.removeItem("AUTH_TOKEN");
    queryClient.invalidateQueries({ queryKey: ["user"] });
  };

  return (
    <Popover className="relative">
      <Popover.Button className="inline-flex items-center gap-x-1 rounded-xl border-2 border-geo-green bg-geo-green p-2 font-bold text-geo-black transition-all duration-200 hover:scale-105 hover:brightness-110 hover:shadow-[0_0_16px_rgba(57,255,20,0.3)]">
        <Bars3Icon className="w-6 h-6" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-300"
        enterFrom="opacity-0 translate-y-2 scale-95"
        enterTo="opacity-100 translate-y-0 scale-100"
        leave="transition ease-in duration-200"
        leaveFrom="opacity-100 translate-y-0 scale-100"
        leaveTo="opacity-0 translate-y-2 scale-95"
      >
        <Popover.Panel className="absolute right-0 z-20 mt-3 w-56 shrink rounded-2xl border-2 border-geo-green/30 bg-[var(--geo-bg-card)] p-3 shadow-xl backdrop-blur-sm">
          <p className="border-b-2 border-geo-green/20 pb-2.5 text-center font-geo text-lg tracking-wide text-[var(--geo-text)]">
            Hola, {name}
          </p>
          <Link
            to="/"
            className="mt-2 block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
          >
            Inicio
          </Link>
          {r === "admin" && (
            <>
              <Link
                to="/leagues"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Mis ligas
              </Link>
              <Link
                to="/leagues/new"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Crear liga
              </Link>
              <Link
                to="/leagues/admins"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Administradores
              </Link>
            </>
          )}
          {r === "coach" && (
            <>
              <Link
                to="/leagues/join"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Unirse a liga
              </Link>
              <Link
                to="/teams"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Mis equipos
              </Link>
              <Link
                to="/teams/new"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Crear equipo
              </Link>
            </>
          )}
          {r === "player" && (
            <>
              <Link
                to="/teams/join"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Unirse a equipo
              </Link>
              <Link
                to="/my-teams"
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
              >
                Mis equipos
              </Link>
            </>
          )}
          <Link
            to="/standings"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
          >
            Tabla de posiciones
          </Link>
          <Link
            to="/results"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
          >
            Resultados
          </Link>
          <Link
            to="/news"
            className="block rounded-xl px-3 py-2.5 text-sm font-medium text-[var(--geo-text)] transition-colors duration-200 hover:bg-geo-green/10 hover:text-geo-green"
          >
            Noticias
          </Link>
          <button
            type="button"
            onClick={logout}
            className="mt-2 block w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 transition-colors duration-200 hover:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
          >
            Cerrar sesión
          </button>
        </Popover.Panel>
      </Transition>
    </Popover>
  );
}
