import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  KeyIcon,
  MapPinIcon,
  PlusCircleIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UserGroupIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation, useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import type { User, Role } from "@/types";
import { useQueryClient } from "@tanstack/react-query";

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

  const logout = () => {
    localStorage.removeItem("AUTH_TOKEN");
    queryClient.invalidateQueries({ queryKey: ["user"] });
    onNavigate?.();
    navigate("/public", { replace: true });
  };

  const adminLinks: NavLinkItem[] = [
    { to: "/leagues", label: "Mis ligas", icon: TrophyIcon },
    { to: "/leagues/new", label: "Crear liga", icon: PlusCircleIcon },
    { to: "/leagues/admins", label: "Administradores", icon: UserGroupIcon },
    { to: "/admin/users", label: "Usuarios", icon: UserGroupIcon },
    { to: "/admin/fields", label: "Campos", icon: MapPinIcon },
    { to: "/admin/seasons", label: "Temporadas", icon: CalendarDaysIcon },
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

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto pr-1">
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

      <button
        type="button"
        onClick={logout}
        className="mt-4 rounded-xl border border-red-500/40 px-3 py-2 text-left text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}