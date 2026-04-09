import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { listAuditLogs } from "@/api/adminAPI";

export default function AuditLogsView() {
  const [leagueId, setLeagueId] = useState<number | "">("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState<"" | "create" | "update" | "delete" | "status_change" | "manual_fix">("");

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

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div>
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Bitácora de auditoría</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Revisa quién hizo cambios, en qué módulo y cuándo.
        </p>
      </div>

      <div className="card-pitch grid gap-4 p-5 md:grid-cols-3">
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
      </div>

      {isLoading && <p className="text-[var(--geo-text-muted)]">Cargando auditoría...</p>}
      {isError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-500">
          No se pudieron cargar los registros de auditoría.
        </p>
      )}

      {!!logs?.length && (
        <div className="card-pitch overflow-x-auto p-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--geo-border)] text-[var(--geo-text-muted)]">
                <th className="p-2">Fecha</th>
                <th className="p-2">Actor</th>
                <th className="p-2">Liga</th>
                <th className="p-2">Entidad</th>
                <th className="p-2">Acción</th>
                <th className="p-2">Motivo</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--geo-border)]/50 align-top">
                  <td className="p-2 whitespace-nowrap">
                    {log.createdAt ? new Date(log.createdAt).toLocaleString() : "-"}
                  </td>
                  <td className="p-2">{log.actor?.name ?? `ID ${log.actorUserId ?? "-"}`}</td>
                  <td className="p-2">{log.league?.name ?? (log.leagueId ? `Liga ${log.leagueId}` : "-")}</td>
                  <td className="p-2">
                    {log.entityType} #{log.entityId}
                  </td>
                  <td className="p-2">{log.action}</td>
                  <td className="p-2 max-w-[320px] break-words">{log.reason || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && !logs?.length && (
        <p className="text-[var(--geo-text-muted)]">No hay registros con los filtros actuales.</p>
      )}
    </div>
  );
}
