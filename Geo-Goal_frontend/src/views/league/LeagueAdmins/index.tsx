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
      <div>
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Administradores por liga</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Asigna, cambia rol y elimina admins principal/asistente para cada liga.
        </p>
      </div>

      <div className="card-pitch grid gap-4 p-5 md:grid-cols-4">
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
        <div className="card-pitch overflow-x-auto p-4">
          {isLoading ? (
            <p className="text-[var(--geo-text-muted)]">Cargando asignaciones...</p>
          ) : !assignments?.length ? (
            <p className="text-[var(--geo-text-muted)]">Esta liga no tiene admins asignados.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--geo-border)] text-[var(--geo-text-muted)]">
                  <th className="p-2">Usuario</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Rol en liga</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b border-[var(--geo-border)]/50">
                    <td className="p-2">{a.adminUser?.name || `ID ${a.userId}`}</td>
                    <td className="p-2">{a.adminUser?.email || "-"}</td>
                    <td className="p-2">
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
                    <td className="p-2">
                      <button
                        className="rounded-lg border border-red-500 px-3 py-1 text-red-500"
                        onClick={() => {
                          if (!window.confirm("¿Remover admin de esta liga?")) return;
                          removeMutation.mutate(a.userId);
                        }}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
