import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLeagues } from "@/api/leagueAPI";
import {
  changeSeasonStatus,
  createSeason,
  deleteSeason,
  listSeasonsByLeague,
} from "@/api/adminAPI";
import type { SeasonStatus } from "@/types";
import { toast } from "react-toastify";

type SeasonForm = {
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  status: SeasonStatus;
  isCurrent: boolean;
  reason: string;
};

const initialForm: SeasonForm = {
  name: "",
  year: new Date().getFullYear(),
  startDate: "",
  endDate: "",
  status: "draft",
  isCurrent: false,
  reason: "",
};

export default function SeasonManagementView() {
  const queryClient = useQueryClient();
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | "">("");
  const [form, setForm] = useState<SeasonForm>(initialForm);

  const { data: leagues } = useQuery({
    queryKey: ["leagues"],
    queryFn: getLeagues,
  });

  const { data: seasons, isLoading, isError } = useQuery({
    queryKey: ["admin-seasons", selectedLeagueId],
    queryFn: () => listSeasonsByLeague(Number(selectedLeagueId)),
    enabled: !!selectedLeagueId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createSeason(Number(selectedLeagueId), {
        name: form.name,
        year: Number(form.year),
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status,
        isCurrent: form.isCurrent,
        reason: form.reason || undefined,
      }),
    onSuccess: () => {
      toast.success("Temporada creada");
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["admin-seasons", selectedLeagueId] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al crear temporada"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ seasonId, status }: { seasonId: number; status: SeasonStatus }) =>
      changeSeasonStatus(seasonId, { status, reason: "Cambio de estado desde panel admin" }),
    onSuccess: () => {
      toast.success("Estado actualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-seasons", selectedLeagueId] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al cambiar estado"),
  });

  const deleteMutation = useMutation({
    mutationFn: (seasonId: number) => deleteSeason(seasonId, "Eliminación manual desde panel admin"),
    onSuccess: () => {
      toast.success("Temporada eliminada");
      queryClient.invalidateQueries({ queryKey: ["admin-seasons", selectedLeagueId] });
    },
    onError: (error: Error) => toast.error(error.message || "Error al eliminar temporada"),
  });

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div>
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Gestión de temporadas</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Crea y controla el estado de temporadas por liga.
        </p>
      </div>

      <div className="card-pitch p-4">
        <label className="block text-sm font-semibold text-[var(--geo-text)] mb-2">Liga</label>
        <select
          className="input-pitch max-w-lg"
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
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
        className="card-pitch grid gap-4 p-5 lg:grid-cols-3"
      >
        <input
          className="input-pitch"
          placeholder="Nombre de temporada"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          type="number"
          placeholder="Año"
          value={form.year}
          onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
          required
        />
        <select
          className="input-pitch"
          value={form.status}
          onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as SeasonStatus }))}
        >
          <option value="draft">draft</option>
          <option value="active">active</option>
          <option value="finished">finished</option>
          <option value="archived">archived</option>
        </select>
        <input
          className="input-pitch"
          type="date"
          value={form.startDate}
          onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
          required
        />
        <input
          className="input-pitch"
          type="date"
          value={form.endDate}
          onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
          required
        />
        <label className="flex items-center gap-2 text-sm text-[var(--geo-text)]">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm((p) => ({ ...p, isCurrent: e.target.checked }))}
          />
          Marcar como actual
        </label>
        <input
          className="input-pitch lg:col-span-2"
          placeholder="Motivo (auditoría)"
          value={form.reason}
          onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
        />
        <button
          className="btn-pitch py-2.5"
          disabled={!selectedLeagueId || createMutation.isPending}
        >
          {createMutation.isPending ? "Creando..." : "Crear temporada"}
        </button>
      </form>

      {!selectedLeagueId && (
        <p className="text-[var(--geo-text-muted)]">Selecciona una liga para gestionar temporadas.</p>
      )}

      {selectedLeagueId && isLoading && (
        <p className="text-[var(--geo-text-muted)]">Cargando temporadas...</p>
      )}

      {selectedLeagueId && isError && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-red-500">
          No se pudieron cargar las temporadas.
        </p>
      )}

      {selectedLeagueId && !!seasons?.length && (
        <div className="card-pitch overflow-x-auto p-3">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--geo-border)] text-[var(--geo-text-muted)]">
                <th className="p-2">Temporada</th>
                <th className="p-2">Año</th>
                <th className="p-2">Fechas</th>
                <th className="p-2">Estado</th>
                <th className="p-2">Actual</th>
                <th className="p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {seasons.map((season) => (
                <tr key={season.id} className="border-b border-[var(--geo-border)]/50">
                  <td className="p-2">{season.name}</td>
                  <td className="p-2">{season.year}</td>
                  <td className="p-2">{season.startDate} → {season.endDate}</td>
                  <td className="p-2">
                    <select
                      className="input-pitch"
                      value={season.status}
                      onChange={(e) =>
                        statusMutation.mutate({
                          seasonId: season.id,
                          status: e.target.value as SeasonStatus,
                        })
                      }
                    >
                      <option value="draft">draft</option>
                      <option value="active">active</option>
                      <option value="finished">finished</option>
                      <option value="archived">archived</option>
                    </select>
                  </td>
                  <td className="p-2">{season.isCurrent ? "Sí" : "No"}</td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="rounded-lg border border-red-500 px-3 py-1 text-red-500"
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar temporada ${season.name}?`)) return;
                        deleteMutation.mutate(season.id);
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
