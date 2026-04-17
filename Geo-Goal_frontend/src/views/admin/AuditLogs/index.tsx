import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { listAuditLogs } from "@/api/adminAPI";

export default function AuditLogsView() {
  const [leagueId, setLeagueId] = useState<number | "">("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState<"" | "create" | "update" | "delete" | "status_change" | "manual_fix">("");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { data: logs, isLoading, isError } = useQuery({
    queryKey: ["audit-logs", leagueId, entityType, action],
    queryFn: () =>
      listAuditLogs({
        leagueId: leagueId ? Number(leagueId) : undefined,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  const filteredLogs = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return logs ?? [];
    return (logs ?? []).filter((log) => {
      const actor = log.actor?.name?.toLowerCase() || "";
      const league = log.league?.name?.toLowerCase() || "";
      const entity = `${log.entityType} ${log.entityId}`.toLowerCase();
      const reason = (log.reason || "").toLowerCase();
      return (
        actor.includes(normalized) ||
        league.includes(normalized) ||
        entity.includes(normalized) ||
        reason.includes(normalized)
      );
    });
  }, [logs, searchTerm]);

  const metrics = useMemo(() => {
    const source = filteredLogs;
    return {
      total: source.length,
      create: source.filter((log) => log.action === "create").length,
      update: source.filter((log) => log.action === "update").length,
      delete: source.filter((log) => log.action === "delete").length,
    };
  }, [filteredLogs]);

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Bitácora de auditoría</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Revisa quién hizo cambios, en qué módulo y cuándo.
        </p>
      </div>

      <div className="card-pitch grid gap-4 p-5 opacity-0 animate-in-up stagger-2 md:grid-cols-3">
        <select
          className="input-pitch"
          value={leagueId}
          onChange={(e) => setLeagueId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Todas las ligas</option>
          {leagues?.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>

        <input
          className="input-pitch"
          placeholder="entityType (ej: season, match, fixture)"
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
        />

        <select
          className="input-pitch"
          value={action}
          onChange={(e) => setAction(e.target.value as typeof action)}
        >
          <option value="">Todas las acciones</option>
          <option value="create">create</option>
          <option value="update">update</option>
          <option value="delete">delete</option>
          <option value="status_change">status_change</option>
          <option value="manual_fix">manual_fix</option>
        </select>

        <input
          className="input-pitch md:col-span-3"
          placeholder="Buscar en actor, liga, entidad o motivo"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-4 opacity-0 animate-in-up stagger-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registros visibles" value={metrics.total} accent="text-[var(--geo-text)]" />
        <MetricCard label="Create" value={metrics.create} accent="text-geo-green" />
        <MetricCard label="Update" value={metrics.update} accent="text-blue-300" />
        <MetricCard label="Delete" value={metrics.delete} accent="text-red-400" />
      </div>

      <div className="card-pitch p-4 opacity-0 animate-in-up stagger-4">
        <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Distribución de acciones</p>
        <div className="mt-3 space-y-3">
          {[
            { label: "create", value: metrics.create, color: "#39FF14" },
            { label: "update", value: metrics.update, color: "#60a5fa" },
            { label: "delete", value: metrics.delete, color: "#f87171" },
          ].map((item) => {
            const pct = metrics.total ? Math.round((item.value / metrics.total) * 100) : 0;
            return (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--geo-text-muted)]">{item.label}</span>
                  <span className="font-semibold text-[var(--geo-text)]">{item.value} ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/10">
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: item.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isLoading && <p className="text-[var(--geo-text-muted)]">Cargando auditoría...</p>}
      {isError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-500">
          No se pudieron cargar los registros de auditoría.
        </p>
      )}

      {!!logs?.length && (
        <div className="card-pitch overflow-x-auto p-4 opacity-0 animate-in-up stagger-5">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--geo-border)] text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">
                <th className="p-3">Fecha</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Liga</th>
                <th className="p-3">Entidad</th>
                <th className="p-3">Acción</th>
                <th className="p-3">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-[var(--geo-border)]/40 align-top transition-colors hover:bg-white/[0.03]"
                >
                  <td className="whitespace-nowrap p-3 text-[var(--geo-text-muted)]">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="p-3 font-medium text-[var(--geo-text)]">
                    {log.actor?.name ?? `ID ${log.actorUserId ?? "-"}`}
                  </td>
                  <td className="p-3 text-[var(--geo-text-muted)]">
                    {log.league?.name ?? (log.leagueId ? `Liga ${log.leagueId}` : "-")}
                  </td>
                  <td className="p-3">
                    <span className="rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-[var(--geo-text)]">
                      {log.entityType} #{log.entityId}
                    </span>
                  </td>
                  <td className="p-3">
                    <ActionBadge action={log.action} />
                  </td>
                  <td className="max-w-[320px] break-words p-3 text-[var(--geo-text-muted)]">{log.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !isError && !!logs?.length && !filteredLogs.length && (
        <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-[var(--geo-text-muted)]">
          No hay registros que coincidan con la búsqueda actual.
        </p>
      )}

      {!isLoading && !logs?.length && (
        <p className="text-[var(--geo-text-muted)]">No hay registros con los filtros actuales.</p>
      )}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="card-pitch p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">{label}</p>
      <p className={`mt-2 text-3xl font-geo ${accent}`}>{value}</p>
    </div>
  );
}

function ActionBadge({
  action,
}: {
  action: "create" | "update" | "delete" | "status_change" | "manual_fix";
}) {
  const classes =
    action === "create"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
      : action === "update"
        ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
        : action === "delete"
          ? "border-red-500/40 bg-red-500/10 text-red-400"
          : action === "status_change"
            ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
            : "border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-300";

  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>{action}</span>;
}
