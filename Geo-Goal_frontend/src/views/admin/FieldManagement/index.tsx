import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createField, deleteField, listFields, updateField } from "@/api/adminAPI";
import { getLeagues, getTeamsLeague } from "@/api/leagueAPI";
import { toast } from "react-toastify";
import type { AdminField } from "@/types";

type FieldForm = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
  country?: string;
  capacity?: number;
  isActive: boolean;
  notes?: string;
  leagueId?: number;
  teamId?: number;
};

const defaultForm: FieldForm = {
  name: "",
  address: "",
  lat: 0,
  lng: 0,
  isActive: true,
};

export default function FieldManagementView() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FieldForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: fields, isLoading, isError } = useQuery({
    queryKey: ["admin-fields"],
    queryFn: listFields,
  });

  const { data: leagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { data: leagueTeams } = useQuery({
    queryKey: ["league-teams", form.leagueId],
    queryFn: async () => {
      if (!form.leagueId) return [];
      const data = await getTeamsLeague(form.leagueId);
      return data.teams || [];
    },
    enabled: !!form.leagueId,
  });

  const createMutation = useMutation({
    mutationFn: createField,
    onSuccess: (msg) => {
      toast.success(msg || "Campo creado");
      setForm(defaultForm);
      queryClient.invalidateQueries({ queryKey: ["admin-fields"] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al crear campo"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ fieldId, payload }: { fieldId: number; payload: Partial<FieldForm> }) =>
      updateField(fieldId, payload),
    onSuccess: (msg) => {
      toast.success(msg || "Campo actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-fields"] });
      setEditingId(null);
    },
    onError: (error: Error) => toast.error(error.message || "Error al actualizar campo"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteField,
    onSuccess: (msg) => {
      toast.success(msg || "Campo eliminado");
      queryClient.invalidateQueries({ queryKey: ["admin-fields"] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al eliminar campo"),
  });

  const submitCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const startEdit = (field: AdminField) => {
    setEditingId(field.id);
    setForm({
      name: field.name,
      address: field.address,
      lat: Number(field.lat),
      lng: Number(field.lng),
      city: field.city ?? undefined,
      state: field.state ?? undefined,
      country: field.country ?? undefined,
      capacity: field.capacity ?? undefined,
      isActive: field.isActive,
      notes: field.notes ?? undefined,
      leagueId: field.leagueId ?? undefined,
      teamId: field.teamId ?? undefined,
    });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateMutation.mutate({ fieldId: editingId, payload: form });
  };

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div>
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Gestión de campos</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Crea, edita y elimina campos de juego para control logístico.
        </p>
      </div>

      <form onSubmit={submitCreate} className="card-pitch grid gap-4 p-5 lg:grid-cols-2">
        <input
          className="input-pitch"
          placeholder="Nombre del campo"
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          placeholder="Dirección"
          value={form.address}
          onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          type="number"
          step="any"
          placeholder="Latitud"
          value={form.lat}
          onChange={(e) => setForm((prev) => ({ ...prev, lat: Number(e.target.value) }))}
          required
        />
        <input
          className="input-pitch"
          type="number"
          step="any"
          placeholder="Longitud"
          value={form.lng}
          onChange={(e) => setForm((prev) => ({ ...prev, lng: Number(e.target.value) }))}
          required
        />
        <input
          className="input-pitch"
          placeholder="Ciudad"
          value={form.city ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value || undefined }))}
        />
        <input
          className="input-pitch"
          placeholder="País"
          value={form.country ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value || undefined }))}
        />
        <input
          className="input-pitch"
          type="number"
          min={0}
          placeholder="Capacidad"
          value={form.capacity ?? ""}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, capacity: e.target.value ? Number(e.target.value) : undefined }))
          }
        />

        <select
          className="input-pitch"
          value={form.leagueId ?? ""}
          onChange={(e) =>
            setForm((prev) => ({
              ...prev,
              leagueId: e.target.value ? Number(e.target.value) : undefined,
              teamId: undefined,
            }))
          }
        >
          <option value="">Sin liga</option>
          {leagues?.map((league) => (
            <option key={league.id} value={league.id}>
              {league.name}
            </option>
          ))}
        </select>

        <select
          className="input-pitch"
          value={form.teamId ?? ""}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, teamId: e.target.value ? Number(e.target.value) : undefined }))
          }
          disabled={!form.leagueId}
        >
          <option value="">Sin equipo</option>
          {leagueTeams?.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-2 text-sm text-[var(--geo-text)]">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
          />
          Campo activo
        </label>

        <textarea
          className="input-pitch lg:col-span-2"
          placeholder="Notas"
          value={form.notes ?? ""}
          onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value || undefined }))}
        />

        <div className="lg:col-span-2 flex gap-3">
          {!editingId ? (
            <button className="btn-pitch px-4 py-2.5" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Guardando..." : "Crear campo"}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-pitch px-4 py-2.5"
                onClick={saveEdit}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Guardando..." : "Actualizar campo"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--geo-border)] px-4 py-2.5 text-[var(--geo-text)]"
                onClick={() => {
                  setEditingId(null);
                  setForm(defaultForm);
                }}
              >
                Cancelar edición
              </button>
            </>
          )}
        </div>
      </form>

      {isLoading && <p className="text-[var(--geo-text-muted)]">Cargando campos...</p>}
      {isError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-500">
          No se pudieron cargar los campos.
        </p>
      )}

      {!!fields?.length && (
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <article key={field.id} className="card-pitch p-4">
              <h2 className="font-geo text-2xl text-geo-green">{field.name}</h2>
              <p className="text-sm text-[var(--geo-text-muted)] mt-1">{field.address}</p>
              <p className="text-sm text-[var(--geo-text-muted)] mt-1">
                {field.city || "-"}, {field.country || "-"}
              </p>
              <p className="text-xs text-[var(--geo-text-muted)] mt-2">
                Lat/Lng: {field.lat}, {field.lng}
              </p>
              <p className="text-xs text-[var(--geo-text-muted)]">
                Liga: {field.league?.name ?? "Sin liga"} · Equipo: {field.team?.name ?? "Sin equipo"}
              </p>
              <p className="text-xs mt-1 text-[var(--geo-text-muted)]">
                Estado: {field.isActive ? "Activo" : "Inactivo"}
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded-lg border border-geo-green px-3 py-1 text-geo-green"
                  onClick={() => startEdit(field)}
                >
                  Editar
                </button>
                <button
                  className="rounded-lg border border-red-500 px-3 py-1 text-red-500"
                  onClick={() => {
                    if (!window.confirm(`¿Eliminar campo ${field.name}?`)) return;
                    deleteMutation.mutate(field.id);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
