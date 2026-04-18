import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, listUsersByLeague, updateUser } from "@/api/adminAPI";
import { getLeagues } from "@/api/leagueAPI";
import type { AdminUser, Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-toastify";
import {
  VictoryAxis,
  VictoryBar,
  VictoryChart,
  VictoryPie,
  VictoryTooltip,
  VictoryVoronoiContainer,
} from "victory";

type CreateForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  confirmed: boolean;
};

const emptyForm: CreateForm = {
  name: "",
  email: "",
  password: "",
  role: "player",
  confirmed: true,
};

const roleLabelMap: Record<Role, string> = {
  admin: "Admins",
  coach: "Coaches",
  player: "Jugadores",
  referee: "Árbitros",
};

const roleColorMap: Record<Role, string> = {
  admin: "#39FF14",
  coach: "#3b82f6",
  player: "#facc15",
  referee: "#ef4444",
};

export default function UserManagementView() {
  const queryClient = useQueryClient();
  const { data: authUser } = useAuth();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [form, setForm] = useState<CreateForm>(emptyForm);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);

  const usersQueryKey = ["admin-users", selectedLeagueId];

  const { data: leagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { data: users, isLoading, isError } = useQuery({
    queryKey: usersQueryKey,
    queryFn: () => listUsersByLeague(Number(selectedLeagueId)),
    enabled: !!selectedLeagueId,
  });

  const editingUser = useMemo(
    () => users?.find((u) => u.id === editingUserId),
    [users, editingUserId]
  );

  const userMetrics = useMemo(() => {
    const list = users ?? [];
    const total = list.length;
    const confirmed = list.filter((user) => user.confirmed).length;
    const pending = total - confirmed;
    const roleCounts: Record<Role, number> = {
      admin: 0,
      coach: 0,
      player: 0,
      referee: 0,
    };

    const monthCount = new Map<string, number>();
    for (const user of list) {
      roleCounts[user.role] += 1;
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        if (!Number.isNaN(date.getTime())) {
          const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
          monthCount.set(key, (monthCount.get(key) ?? 0) + 1);
        }
      }
    }

    const roleChartData = (Object.keys(roleLabelMap) as Role[]).map((role) => ({
      x: roleLabelMap[role],
      y: roleCounts[role],
      color: roleColorMap[role],
      label: `${roleLabelMap[role]}: ${roleCounts[role]}`,
    }));

    const creationTimeline = Array.from(monthCount.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, value]) => {
        const [year, month] = key.split("-");
        return {
          x: `${month}/${year.slice(2)}`,
          y: value,
        };
      });

    return {
      total,
      confirmed,
      pending,
      roleCounts,
      roleChartData,
      creationTimeline,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return (users ?? []).filter((user) => {
      const matchesRole = roleFilter === "all" ? true : user.role === roleFilter;
      const matchesSearch = normalizedSearch
        ? user.name.toLowerCase().includes(normalizedSearch) ||
          user.email.toLowerCase().includes(normalizedSearch)
        : true;
      return matchesRole && matchesSearch;
    });
  }, [users, searchTerm, roleFilter]);

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (msg) => {
      toast.success(msg || "Usuario creado");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || "Error al crear usuario"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Partial<CreateForm> }) =>
      updateUser(userId, payload),
    onSuccess: (msg) => {
      toast.success(msg || "Usuario actualizado");
      setEditingUserId(null);
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || "Error al actualizar usuario"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: (msg) => {
      toast.success(msg || "Usuario eliminado");
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
    },
    onError: (error: Error) => toast.error(error.message || "Error al eliminar usuario"),
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editingUser) return;

    updateMutation.mutate({
      userId: editingUser.id,
      payload: {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role,
        confirmed: editingUser.confirmed,
      },
    });
  };

  const onDelete = (userId: number, name: string) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    deleteMutation.mutate(userId);
  };

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Gestión de usuarios</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Crea, edita y elimina cuentas de admin, coach, player y referee.
        </p>
      </div>

      <div className="card-pitch p-4 opacity-0 animate-in-up stagger-2">
        <label className="block text-sm font-semibold text-[var(--geo-text)] mb-2">
          Liga a gestionar
        </label>
        <select
          className="input-pitch max-w-lg"
          value={selectedLeagueId}
          onChange={(e) => {
            setSelectedLeagueId(e.target.value ? Number(e.target.value) : "");
            setEditingUserId(null);
          }}
        >
          <option value="">Selecciona una liga</option>
          {leagues?.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>
      </div>

      <form onSubmit={handleCreate} className="card-pitch grid gap-4 p-5 opacity-0 animate-in-up stagger-3 lg:grid-cols-2">
        <input
          className="input-pitch"
          placeholder="Nombre"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          placeholder="Contraseña"
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          required
          minLength={8}
        />
        <select
          className="input-pitch"
          value={form.role}
          onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value as Role }))}
        >
          <option value="admin">admin</option>
          <option value="coach">coach</option>
          <option value="player">player</option>
          <option value="referee">referee</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--geo-text)]">
          <input
            type="checkbox"
            checked={form.confirmed}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmed: e.target.checked }))}
          />
          Cuenta confirmada
        </label>
        <button className="btn-pitch py-2.5" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creando..." : "Crear usuario"}
        </button>
      </form>

      {!selectedLeagueId && (
        <p className="text-[var(--geo-text-muted)]">
          Selecciona una liga para ver solo los usuarios que pertenecen a ella.
        </p>
      )}

      {selectedLeagueId && isLoading && <p className="text-[var(--geo-text-muted)]">Cargando usuarios...</p>}
      {selectedLeagueId && isError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-500">
          No se pudieron cargar los usuarios.
        </p>
      )}

      {selectedLeagueId && !isLoading && !isError && (
        <section className="space-y-4 opacity-0 animate-in-up stagger-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Usuarios totales" value={userMetrics.total} accent="text-[var(--geo-text)]" />
            <MetricCard label="Confirmados" value={userMetrics.confirmed} accent="text-emerald-400" />
            <MetricCard label="Pendientes" value={userMetrics.pending} accent="text-amber-300" />
            <MetricCard
              label="Roles activos"
              value={Object.values(userMetrics.roleCounts).filter((count) => count > 0).length}
              accent="text-geo-green"
            />
          </div>

          <div className="card-pitch p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Balance por rol</p>
            <div className="mt-3 space-y-3">
              {(Object.keys(roleLabelMap) as Role[]).map((role) => {
                const count = userMetrics.roleCounts[role];
                const pct = userMetrics.total ? Math.round((count / userMetrics.total) * 100) : 0;
                return (
                  <div key={role} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--geo-text-muted)]">{roleLabelMap[role]}</span>
                      <span className="font-semibold text-[var(--geo-text)]">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div
                        className="h-2 rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: roleColorMap[role] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <div className="card-pitch p-4">
              <h3 className="font-geo text-lg text-[var(--geo-text)]">Distribución de usuarios por rol</h3>
              <p className="mb-2 text-xs text-[var(--geo-text-muted)]">
                Vista rápida para balancear operación, juego y arbitraje.
              </p>
              {userMetrics.total ? (
                <>
                  <VictoryPie
                    height={260}
                    data={userMetrics.roleChartData}
                    colorScale={userMetrics.roleChartData.map((item) => item.color)}
                    labels={({ datum }) => datum.y}
                    labelComponent={
                      <VictoryTooltip
                        flyoutStyle={{ fill: "#18181b", stroke: "#27272a" }}
                        style={{ fill: "#fff", fontSize: 11 }}
                        cornerRadius={6}
                      />
                    }
                    style={{
                      labels: { fill: "#e4e4e7", fontSize: 11, fontWeight: 600 },
                    }}
                    innerRadius={46}
                    padAngle={2}
                  />
                </>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">Sin usuarios para graficar.</p>
              )}
            </div>

            <div className="card-pitch p-4">
              <h3 className="font-geo text-lg text-[var(--geo-text)]">Altas de usuarios (6 meses)</h3>
              <p className="mb-2 text-xs text-[var(--geo-text-muted)]">
                Evolución reciente para medir crecimiento y onboarding.
              </p>
              {userMetrics.creationTimeline.length ? (
                <VictoryChart
                  domainPadding={{ x: 20, y: 14 }}
                  height={290}
                  containerComponent={
                    <VictoryVoronoiContainer
                      labels={({ datum }) => `${datum.x}\n${datum.y} usuario(s)`}
                      labelComponent={
                        <VictoryTooltip
                          flyoutStyle={{ fill: "#18181b", stroke: "#27272a" }}
                          style={{ fill: "#fff", fontSize: 11 }}
                          cornerRadius={6}
                        />
                      }
                    />
                  }
                >
                  <VictoryAxis
                    style={{
                      axis: { stroke: "#3f3f46" },
                      tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    style={{
                      axis: { stroke: "#3f3f46" },
                      tickLabels: { fill: "#a1a1aa", fontSize: 10 },
                      grid: { stroke: "#27272a", strokeDasharray: "4,4" },
                    }}
                  />
                  <VictoryBar
                    data={userMetrics.creationTimeline}
                    style={{
                      data: { fill: "rgba(57,255,20,0.5)", stroke: "#39FF14", strokeWidth: 1.2 },
                    }}
                    barWidth={24}
                    cornerRadius={4}
                  />
                </VictoryChart>
              ) : (
                <p className="text-sm text-[var(--geo-text-muted)]">
                  No hay `createdAt` suficiente para mostrar tendencia.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {selectedLeagueId && !!users?.length && (
        <section className="card-pitch space-y-4 p-4 opacity-0 animate-in-up stagger-5">
          <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="font-geo text-lg text-[var(--geo-text)]">Directorio de usuarios</h3>
              <p className="text-xs text-[var(--geo-text-muted)]">
                {filteredUsers.length} de {users.length} usuario(s) visibles
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <input
                className="input-pitch w-full sm:min-w-72"
                placeholder="Buscar por nombre o email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select
                className="input-pitch sm:min-w-44"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as Role | "all")}
              >
                <option value="all">Todos los roles</option>
                <option value="admin">admin</option>
                <option value="coach">coach</option>
                <option value="player">player</option>
                <option value="referee">referee</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--geo-border)] text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">
                  <th className="p-3 font-semibold">Usuario</th>
                  <th className="p-3 font-semibold">Email</th>
                  <th className="p-3 font-semibold">Rol</th>
                  <th className="p-3 font-semibold">Estado</th>
                  <th className="p-3 font-semibold">ID</th>
                  <th className="p-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-[var(--geo-border)]/40 transition-colors hover:bg-white/[0.03]"
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-geo-green/40 bg-geo-green/10 text-xs font-bold text-geo-green">
                          {user.name
                            .split(" ")
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((part) => part[0]?.toUpperCase())
                            .join("") || "U"}
                        </div>
                        <div className="min-w-0">
                          {editingUserId === user.id ? (
                            <input
                              className="input-pitch w-full"
                              value={user.name}
                              onChange={(e) => {
                                queryClient.setQueryData<AdminUser[]>(usersQueryKey, (old) =>
                                  old?.map((x) => (x.id === user.id ? { ...x, name: e.target.value } : x)) ?? []
                                );
                              }}
                            />
                          ) : (
                            <p className="truncate font-semibold text-[var(--geo-text)]">{user.name}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <input
                          className="input-pitch w-full"
                          type="email"
                          value={user.email}
                          onChange={(e) => {
                            queryClient.setQueryData<AdminUser[]>(usersQueryKey, (old) =>
                              old?.map((x) => (x.id === user.id ? { ...x, email: e.target.value } : x)) ?? []
                            );
                          }}
                        />
                      ) : (
                        <p className="truncate text-[var(--geo-text-muted)]">{user.email}</p>
                      )}
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <select
                          className="input-pitch"
                          value={user.role}
                          onChange={(e) => {
                            queryClient.setQueryData<AdminUser[]>(usersQueryKey, (old) =>
                              old?.map((x) =>
                                x.id === user.id ? { ...x, role: e.target.value as Role } : x
                              ) ?? []
                            );
                          }}
                        >
                          <option value="admin">admin</option>
                          <option value="coach">coach</option>
                          <option value="player">player</option>
                          <option value="referee">referee</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            user.role === "admin"
                              ? "border-geo-green/40 bg-geo-green/10 text-geo-green"
                              : user.role === "coach"
                                ? "border-blue-500/40 bg-blue-500/10 text-blue-300"
                                : user.role === "player"
                                  ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"
                                  : "border-red-500/40 bg-red-500/10 text-red-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {editingUserId === user.id ? (
                        <label className="inline-flex items-center gap-2 text-xs text-[var(--geo-text-muted)]">
                          <input
                            type="checkbox"
                            checked={user.confirmed}
                            onChange={(e) => {
                              queryClient.setQueryData<AdminUser[]>(usersQueryKey, (old) =>
                                old?.map((x) =>
                                  x.id === user.id ? { ...x, confirmed: e.target.checked } : x
                                ) ?? []
                              );
                            }}
                          />
                          Confirmado
                        </label>
                      ) : (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            user.confirmed
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                          }`}
                        >
                          {user.confirmed ? "Confirmado" : "Pendiente"}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[var(--geo-text-muted)]">{user.id}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        {editingUserId === user.id ? (
                          <>
                            <button
                              type="button"
                              className="btn-pitch px-3 py-1.5"
                              onClick={handleUpdate}
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              className="rounded-lg border border-white/20 px-3 py-1.5 text-[var(--geo-text-muted)] hover:text-[var(--geo-text)]"
                              onClick={() => {
                                setEditingUserId(null);
                                queryClient.invalidateQueries({ queryKey: usersQueryKey });
                              }}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="rounded-lg border border-geo-green/50 px-3 py-1.5 font-medium text-geo-green hover:bg-geo-green/10"
                            onClick={() => setEditingUserId(user.id)}
                          >
                            Editar
                          </button>
                        )}
                        <button
                          type="button"
                          className="rounded-lg border border-red-500/60 px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => onDelete(user.id, user.name)}
                          disabled={authUser?.id === user.id}
                          title={authUser?.id === user.id ? "No puedes eliminarte" : "Eliminar usuario"}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!filteredUsers.length && (
            <p className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--geo-text-muted)]">
              No hay usuarios que coincidan con el filtro actual.
            </p>
          )}
        </section>
      )}

      {selectedLeagueId && !isLoading && !users?.length && (
        <p className="text-[var(--geo-text-muted)]">No hay usuarios vinculados a esta liga.</p>
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
