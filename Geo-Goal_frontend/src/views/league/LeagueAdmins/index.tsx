import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import { listUsers, listLeagueAdmins, assignLeagueAdmin, removeLeagueAdmin, updateLeagueAdminRole } from "@/api/adminAPI";
import { toast } from "react-toastify";

export default function LeagueAdminsView() {
  const queryClient = useQueryClient();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | "">("");
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [leagueRole, setLeagueRole] = useState<"principal" | "assistant">("assistant");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: leagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: listUsers,
  });

  const { data: assignments, isLoading } = useQuery({
    queryKey: ["league-admins", selectedLeagueId],
    queryFn: () => listLeagueAdmins(Number(selectedLeagueId)),
    enabled: !!selectedLeagueId,
  });

  const adminUsers = useMemo(
    () => (users || []).filter((u) => u.role === "admin"),
    [users]
  );

  const selectedLeague = useMemo(
    () => leagues?.find((league) => league.id === selectedLeagueId),
    [leagues, selectedLeagueId]
  );

  const assignmentMetrics = useMemo(() => {
    const list = assignments ?? [];
    const principalCount = list.filter((item) => item.leagueRole === "principal").length;
    const assistantCount = list.filter((item) => item.leagueRole === "assistant").length;
    return {
      total: list.length,
      principalCount,
      assistantCount,
      withoutEmail: list.filter((item) => !item.adminUser?.email).length,
    };
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return assignments ?? [];
    return (assignments ?? []).filter((item) => {
      const name = item.adminUser?.name?.toLowerCase() || "";
      const email = item.adminUser?.email?.toLowerCase() || "";
      return name.includes(normalized) || email.includes(normalized);
    });
  }, [assignments, searchTerm]);

  const assignMutation = useMutation({
    mutationFn: (payload: { leagueId: number; userId: number; leagueRole: "principal" | "assistant" }) =>
      assignLeagueAdmin(payload.leagueId, { userId: payload.userId, leagueRole: payload.leagueRole }),
    onSuccess: (msg) => {
      toast.success(msg || "Admin asignado");
      queryClient.invalidateQueries({ queryKey: ["league-admins", selectedLeagueId] });
      setSelectedUserId("");
      setLeagueRole("assistant");
    },
    onError: (error: Error) => toast.error(error.message || "Error al asignar admin"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: "principal" | "assistant" }) =>
      updateLeagueAdminRole(Number(selectedLeagueId), userId, { leagueRole: role }),
    onSuccess: (msg) => {
      toast.success(msg || "Rol actualizado");
      queryClient.invalidateQueries({ queryKey: ["league-admins", selectedLeagueId] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al actualizar rol"),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: number) => removeLeagueAdmin(Number(selectedLeagueId), userId),
    onSuccess: (msg) => {
      toast.success(msg || "Admin removido");
      queryClient.invalidateQueries({ queryKey: ["league-admins", selectedLeagueId] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al remover admin"),
  });

  return (
    <div className="space-y-7 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>
      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Administradores por liga</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Asigna, cambia rol y elimina admins principal/asistente para cada liga.
        </p>
      </div>

      <div className="card-pitch grid gap-4 p-5 opacity-0 animate-in-up stagger-2 md:grid-cols-4">
        <select
          className="input-pitch"
          value={selectedLeagueId}
          onChange={(e) => setSelectedLeagueId(e.target.value ? Number(e.target.value) : "")}
        >
          <option value="">Selecciona liga</option>
          {leagues?.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>

        <select
          className="input-pitch"
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : "")}
          disabled={!selectedLeagueId}
        >
          <option value="">Selecciona admin</option>
          {adminUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>

        <select
          className="input-pitch"
          value={leagueRole}
          onChange={(e) => setLeagueRole(e.target.value as "principal" | "assistant")}
          disabled={!selectedLeagueId}
        >
          <option value="assistant">assistant</option>
          <option value="principal">principal</option>
        </select>

        <button
          className="btn-pitch py-2.5"
          disabled={!selectedLeagueId || !selectedUserId || assignMutation.isPending}
          onClick={() =>
            assignMutation.mutate({
              leagueId: Number(selectedLeagueId),
              userId: Number(selectedUserId),
              leagueRole,
            })
          }
        >
          Asignar admin
        </button>
      </div>

      {selectedLeagueId && (
        <div className="space-y-4 opacity-0 animate-in-up stagger-3">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Asignaciones totales" value={assignmentMetrics.total} accent="text-[var(--geo-text)]" />
            <MetricCard label="Principal" value={assignmentMetrics.principalCount} accent="text-geo-green" />
            <MetricCard label="Asistentes" value={assignmentMetrics.assistantCount} accent="text-blue-300" />
            <MetricCard label="Sin email visible" value={assignmentMetrics.withoutEmail} accent="text-amber-300" />
          </div>

          <div className="card-pitch p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Composición de roles en liga</p>
            <div className="mt-3 space-y-3">
              {[
                { label: "Principal", count: assignmentMetrics.principalCount, color: "#39FF14" },
                { label: "Asistente", count: assignmentMetrics.assistantCount, color: "#60a5fa" },
              ].map((item) => {
                const pct = assignmentMetrics.total ? Math.round((item.count / assignmentMetrics.total) * 100) : 0;
                return (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--geo-text-muted)]">{item.label}</span>
                      <span className="font-semibold text-[var(--geo-text)]">{item.count} ({pct}%)</span>
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

          <div className="card-pitch overflow-x-auto p-4 opacity-0 animate-in-up stagger-4">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-geo text-lg text-[var(--geo-text)]">
                  Equipo administrativo {selectedLeague?.name ? `· ${selectedLeague.name}` : ""}
                </h3>
                <p className="text-xs text-[var(--geo-text-muted)]">
                  {filteredAssignments.length} de {assignmentMetrics.total} asignación(es) visibles
                </p>
              </div>
              <input
                className="input-pitch w-full lg:w-80"
                placeholder="Buscar por nombre o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

          {isLoading ? (
            <p className="text-[var(--geo-text-muted)]">Cargando asignaciones...</p>
          ) : !assignments?.length ? (
            <p className="text-[var(--geo-text-muted)]">Esta liga no tiene admins asignados.</p>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--geo-border)] text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Rol en liga</th>
                  <th className="p-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssignments.map((a) => (
                  <tr
                    key={a.id}
                    className="border-b border-[var(--geo-border)]/40 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-geo-green/40 bg-geo-green/10 text-xs font-bold text-geo-green">
                          {(a.adminUser?.name || "A")
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("")}
                        </div>
                        <p className="font-semibold text-[var(--geo-text)]">{a.adminUser?.name || `ID ${a.userId}`}</p>
                      </div>
                    </td>
                    <td className="p-3 text-[var(--geo-text-muted)]">{a.adminUser?.email || "-"}</td>
                    <td className="p-3">
                      <select
                        className="input-pitch"
                        value={a.leagueRole}
                        onChange={(e) =>
                          updateRoleMutation.mutate({
                            userId: a.userId,
                            role: e.target.value as "principal" | "assistant",
                          })
                        }
                      >
                        <option value="principal">principal</option>
                        <option value="assistant">assistant</option>
                      </select>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end">
                      <button
                        className="rounded-lg border border-red-500/60 px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/10"
                        onClick={() => {
                          if (!window.confirm("¿Remover admin de esta liga?")) return;
                          removeMutation.mutate(a.userId);
                        }}
                      >
                        Remover
                      </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!isLoading && !!assignments?.length && !filteredAssignments.length && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--geo-text-muted)]">
              No hay asignaciones que coincidan con la búsqueda.
            </p>
          )}
          </div>
        </div>
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
