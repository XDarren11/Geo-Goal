import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  MapPinIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  UserCircleIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, type ComponentType } from "react";
import type { User, Role } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { logout, logoutAll } from "@/api/AuthAPI";
import { toast } from "react-toastify";

type NavMenuProps = {
  name: User["name"];
  role?: string;
  onNavigate?: () => void;
};

type NavLinkItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

export default function NavMenu({ name, role, onNavigate }: NavMenuProps) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const r = (role as Role) || "player";
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [isClosingAll, setIsClosingAll] = useState(false);

  const handleLogout = async () => {
    await logout();
    queryClient.invalidateQueries({ queryKey: ["user"] });
    onNavigate?.();
    navigate("/public", { replace: true });
  };

  const handleLogoutAll = async () => {
    try {
      setIsClosingAll(true);
      await logoutAll();
      queryClient.invalidateQueries({ queryKey: ["user"] });
      toast.success("Se cerraron todas tus sesiones");
      onNavigate?.();
      navigate("/public", { replace: true });
    } finally {
      setIsClosingAll(false);
      setShowLogoutAllModal(false);
    }
  };

  const adminLinks: NavLinkItem[] = [
    { to: "/leagues", label: "Mis ligas", icon: TrophyIcon },
    { to: "/leagues/new", label: "Crear liga", icon: PlusCircleIcon },
    { to: "/leagues/admins", label: "Administradores", icon: UserGroupIcon },
    { to: "/admin/users", label: "Usuarios", icon: UserGroupIcon },
    { to: "/admin/fields", label: "Campos", icon: MapPinIcon },
    { to: "/admin/seasons", label: "Temporadas", icon: CalendarDaysIcon },
    { to: "/admin/friendly-matches", label: "Amistosos", icon: CalendarDaysIcon },
    { to: "/admin/audit-logs", label: "Auditoría", icon: ClipboardDocumentListIcon },
    { to: "/admin/referee", label: "Centro de árbitro", icon: ShieldCheckIcon },
  ];

  const coachLinks: NavLinkItem[] = [
    { to: "/leagues/join", label: "Ingresar código de liga", icon: KeyIcon },
    { to: "/teams", label: "Mis equipos", icon: TrophyIcon },
    { to: "/teams/new", label: "Crear equipo", icon: PlusCircleIcon },
    // AQUÍ AGREGAMOS LA NUEVA SECCIÓN DE ESTADÍSTICAS
    { to: "/coach/teams", label: "Estadísticas por equipo", icon: ChartBarIcon },
  ];

  const playerLinks: NavLinkItem[] = [
    { to: "/teams/join", label: "Unirse a equipo", icon: KeyIcon },
    { to: "/my-teams", label: "Mis equipos", icon: UserGroupIcon },
  ];

  const refereeLinks: NavLinkItem[] = [
    { to: "/leagues/join", label: "Ingresar código de liga", icon: KeyIcon },
    { to: "/admin/referee", label: "Centro de árbitro", icon: ShieldCheckIcon },
  ];

  const commonLinks: NavLinkItem[] = [
    { to: "/dashboard", label: "Dashboard", icon: ChartBarIcon },
    { to: "/standings", label: "Tabla de posiciones", icon: ChartBarIcon },
    { to: "/results", label: "Resultados", icon: TrophyIcon },
    { to: "/news", label: "Noticias", icon: DocumentTextIcon },
    { to: "/account", label: "Mi cuenta", icon: UserCircleIcon },
  ];

  const roleLinks =
    r === "admin"
      ? adminLinks
      : r === "coach"
        ? coachLinks
        : r === "referee"
          ? refereeLinks
          : playerLinks;

  const isActive = (to: string) => location.pathname === to || location.pathname.startsWith(`${to}/`);

  const linkClass = (to: string) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
      isActive(to)
        ? "bg-geo-green/20 text-geo-green border border-geo-green/40"
        : "text-[var(--geo-text)] hover:bg-geo-green/10 hover:text-geo-green border border-transparent"
    }`;

  return (
    <aside className="h-full flex flex-col rounded-2xl border border-geo-green/20 bg-[var(--geo-bg-card)] p-4">
      <div className="border-b border-geo-green/20 pb-3">
        <p className="font-geo text-lg tracking-wide text-[var(--geo-text)]">Hola, {name}</p>
        <p className="text-xs uppercase tracking-wider text-[var(--geo-text-muted)]">Rol: {r}</p>
      </div>

      <nav className="mt-4 space-y-5 pr-1">
        <div className="space-y-1">
          <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">General</p>
          {commonLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={onNavigate} className={linkClass(item.to)}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          <p className="px-1 text-[10px] uppercase tracking-[0.2em] text-[var(--geo-text-muted)]">Mis opciones</p>
          {roleLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} onClick={onNavigate} className={linkClass(item.to)}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-500/40 px-3 py-2 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
        >
          Cerrar sesión (este dispositivo)
        </button>
        <button
          type="button"
          onClick={() => setShowLogoutAllModal(true)}
          className="w-full rounded-xl border border-red-500/60 bg-red-500/5 px-3 py-2 text-left text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/15"
        >
          Cerrar todas las sesiones
        </button>
      </div>

      {showLogoutAllModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[var(--geo-bg-card)] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-red-500/10 p-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-geo text-[var(--geo-text)]">Cerrar todas las sesiones</h3>
                <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
                  Esta acción cerrará tu sesión en todos los dispositivos vinculados a tu cuenta.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowLogoutAllModal(false)}
                disabled={isClosingAll}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-[var(--geo-text)] hover:bg-white/5 disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLogoutAll}
                disabled={isClosingAll}
                className="rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-60"
              >
                {isClosingAll ? "Cerrando..." : "Sí, cerrar todas"}
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}