/**
 * AdminCareerDashboard — historial de ligas creadas por un administrador.
 * Accesible en /admins/:adminId/dashboard
 */
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getAdminDashboard, type AdminLeagueItem } from "@/api/publicAPI";
import FavoriteStarButton from "@/components/FavoriteStarButton";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es", { year: "numeric", month: "short" });
}

function KpiCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "emerald" | "sky" | "violet" | "amber";
}) {
  const color =
    accent === "emerald" ? "text-emerald-300" :
    accent === "sky"     ? "text-sky-300" :
    accent === "violet"  ? "text-violet-300" :
    accent === "amber"   ? "text-amber-300" :
    "text-[var(--geo-text)]";

  return (
    <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4 flex-1">
      <div className="text-xs uppercase tracking-wider text-[var(--geo-text-muted)]">{label}</div>
      <div className={`text-2xl font-black mt-1 ${color}`}>{value}</div>
      {hint ? <div className="text-[10px] text-[var(--geo-text-muted)] mt-1">{hint}</div> : null}
    </div>
  );
}

function LeagueCard({ league }: { league: AdminLeagueItem }) {
  const pct    = league.matchesTotal > 0 ? league.matchesPlayed / league.matchesTotal : 0;
  const isOver = pct >= 1 && league.matchesTotal > 0;
  const isNew  = league.matchesPlayed === 0;
  const barColor = isOver ? "bg-emerald-500" : isNew ? "bg-zinc-600" : "bg-sky-500";

  return (
    <Link
      to={`/public/leagues/${league.leagueId}`}
      className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4 hover:border-emerald-500/40 transition block"
    >
      <div className="flex items-center gap-3 mb-3">
        {league.logoUrl ? (
          <img
            src={league.logoUrl}
            alt={league.name}
            className="w-10 h-10 rounded-lg object-contain bg-white/5"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-lg">🏆</div>
        )}
        <div className="flex-1 min-w-0">
          <div className="font-bold truncate text-[var(--geo-text)]">{league.name}</div>
          <div className="text-[10px] text-[var(--geo-text-muted)] mt-0.5">
            {league.teamsCount} equipos · creada {formatDate(league.createdAt)}
          </div>
        </div>
        {isOver ? (
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5">Finalizada</span>
        ) : isNew ? (
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-500/10 rounded px-1.5 py-0.5">Sin partidos</span>
        ) : (
          <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 rounded px-1.5 py-0.5">En curso</span>
        )}
      </div>

      {/* Match progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 rounded-full bg-[var(--geo-bg)] overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.round(pct * 100)}%` }} />
        </div>
        <span className="text-[10px] text-[var(--geo-text-muted)] tabular-nums shrink-0">
          {league.matchesPlayed}/{league.matchesTotal}
        </span>
      </div>
    </Link>
  );
}

export default function AdminCareerDashboard() {
  const { adminId } = useParams<{ adminId: string }>();
  const id = Number(adminId);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-career-dashboard", id],
    queryFn:  () => getAdminDashboard(id),
    enabled:  Number.isInteger(id) && id > 0,
    staleTime: 60_000,
  });

  if (!Number.isInteger(id) || id <= 0)
    return <div className="p-6 text-red-400">ID de administrador no válido</div>;

  if (isLoading)
    return <div className="p-6 text-[var(--geo-text-muted)]">Cargando historial de ligas...</div>;

  if (isError || !data)
    return <div className="p-6 text-red-400">Error al cargar el dashboard del administrador</div>;

  const active    = data.leagues.filter((l) => l.matchesPlayed > 0 && l.matchesPlayed < l.matchesTotal).length;
  const finished  = data.leagues.filter((l) => l.matchesTotal > 0 && l.matchesPlayed >= l.matchesTotal).length;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-[var(--geo-text)]">
              🏛️ {data.admin.name}
            </h1>
            {data.admin.username && (
              <p className="text-sm text-emerald-400">@{data.admin.username}</p>
            )}
            <p className="text-sm text-[var(--geo-text-muted)] mt-0.5">
              Administrador · {data.totalLeagues} {data.totalLeagues === 1 ? "liga creada" : "ligas creadas"}
            </p>
          </div>
          <FavoriteStarButton
            entityType="admin"
            entityId={id}
            label={data.admin.name}
            size="md"
          />
        </div>
      </div>

      {/* KPI row */}
      <div className="flex gap-3 flex-wrap">
        <KpiCard label="Ligas"           value={data.totalLeagues}  accent="emerald" />
        <KpiCard label="Equipos totales" value={data.totalTeams}    accent="sky" />
        <KpiCard label="Partidos"        value={data.totalMatches}  accent="violet" />
        <KpiCard
          label="En curso"
          value={active}
          hint={`${finished} finalizadas`}
          accent="amber"
        />
      </div>

      {/* League list */}
      <section>
        <h2 className="text-sm font-bold text-[var(--geo-text)] mb-3">🏆 Historial de ligas</h2>
        {data.leagues.length === 0 ? (
          <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-8 text-center text-[var(--geo-text-muted)]">
            Este administrador aún no ha creado ligas.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.leagues.map((league) => (
              <LeagueCard key={league.leagueId} league={league} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
