import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, deleteUser, listUsersByLeague, updateUser } from "@/api/adminAPI";
import { getLeagues } from "@/api/leagueAPI";
import type { AdminUser, Role } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-toastify";

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

export default function UserManagementView() {
  const queryClient = useQueryClient();
  const { data: authUser } = useAuth();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | "">("");
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

      <div>
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Gestión de usuarios</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Crea, edita y elimina cuentas de admin, coach, player y referee.
        </p>
      </div>

      <div className="card-pitch p-4">
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

      <form onSubmit={handleCreate} className="card-pitch grid gap-4 p-5 lg:grid-cols-2">
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

      {selectedLeagueId && !!users?.length && (
        <div className="card-pitch overflow-x-auto p-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--geo-border)] text-[var(--geo-text-muted)]">
                <th className="p-2">ID</th>
                <th className="p-2">Nombre</th>
                <th className="p-2">Email</th>
                <th className="p-2">Rol</th>
                <th className="p-2">Confirmado</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--geo-border)]/50">
                  <td className="p-2">{user.id}</td>
                  <td className="p-2">
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
                      user.name
                    )}
                  </td>
                  <td className="p-2">
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
                      user.email
                    )}
                  </td>
                  <td className="p-2">
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
                      user.role
                    )}
                  </td>
                  <td className="p-2">
                    {editingUserId === user.id ? (
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
                    ) : user.confirmed ? (
                      "Sí"
                    ) : (
                      "No"
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex gap-2">
                      {editingUserId === user.id ? (
                        <button
                          type="button"
                          className="btn-pitch px-3 py-1"
                          onClick={handleUpdate}
                        >
                          Guardar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-lg border border-geo-green px-3 py-1 text-geo-green"
                          onClick={() => setEditingUserId(user.id)}
                        >
                          Editar
                        </button>
                      )}

                      <button
                        type="button"
                        className="rounded-lg border border-red-500 px-3 py-1 text-red-500"
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
      )}

      {selectedLeagueId && !isLoading && !users?.length && (
        <p className="text-[var(--geo-text-muted)]">No hay usuarios vinculados a esta liga.</p>
      )}
    </div>
  );
}
