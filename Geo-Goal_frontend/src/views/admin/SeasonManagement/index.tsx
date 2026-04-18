import { useMemo, useState } from "react";
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
  const [searchTerm, setSearchTerm] = useState("");
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

  const filteredSeasons = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return seasons ?? [];
    return (seasons ?? []).filter(
      (season) =>
        season.name.toLowerCase().includes(normalized) ||
        String(season.year).includes(normalized) ||
        season.status.toLowerCase().includes(normalized)
    );
  }, [seasons, searchTerm]);

  const metrics = useMemo(() => {
    const list = seasons ?? [];
    return {
      total: list.length,
      active: list.filter((season) => season.status === "active").length,
      draft: list.filter((season) => season.status === "draft").length,
      finished: list.filter((season) => season.status === "finished").length,
      archived: list.filter((season) => season.status === "archived").length,
      current: list.filter((season) => season.isCurrent).length,
    };
  }, [seasons]);

  return (
    <div className="space-y-8 opacity-0 animate-in-up">
      <Link to="/dashboard" className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green">
        ← Inicio
      </Link>

      <div className="opacity-0 animate-in-up stagger-1">
        <h1 className="font-geo text-4xl tracking-wide text-[var(--geo-text)]">Gestión de temporadas</h1>
        <p className="mt-2 text-[var(--geo-text-muted)]">
          Crea y controla el estado de temporadas por liga.
        </p>
      </div>

      <div className="card-pitch p-4 opacity-0 animate-in-up stagger-2">
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
        className="card-pitch grid gap-4 p-5 opacity-0 animate-in-up stagger-3 lg:grid-cols-3"
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
        <section className="space-y-4 opacity-0 animate-in-up stagger-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard label="Temporadas" value={metrics.total} accent="text-[var(--geo-text)]" />
            <MetricCard label="Activas" value={metrics.active} accent="text-geo-green" />
            <MetricCard label="Draft" value={metrics.draft} accent="text-blue-300" />
            <MetricCard label="Finalizadas" value={metrics.finished} accent="text-amber-300" />
            <MetricCard label="Archivadas" value={metrics.archived} accent="text-red-400" />
          </div>

          <div className="card-pitch p-4">
            <p className="text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">Estado de temporadas</p>
            <div className="mt-3 space-y-3">
              {[
                { label: "Activas", value: metrics.active, color: "#39FF14" },
                { label: "Draft", value: metrics.draft, color: "#60a5fa" },
                { label: "Finalizadas", value: metrics.finished, color: "#facc15" },
                { label: "Archivadas", value: metrics.archived, color: "#f87171" },
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

          <div className="card-pitch overflow-x-auto p-3">
            <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="font-geo text-lg text-[var(--geo-text)]">Directorio de temporadas</h3>
                <p className="text-xs text-[var(--geo-text-muted)]">
                  {filteredSeasons.length} de {seasons.length} temporada(s) visibles
                </p>
              </div>
              <input
                className="input-pitch w-full lg:w-80"
                placeholder="Buscar por nombre, año o estado"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--geo-border)] text-xs uppercase tracking-wide text-[var(--geo-text-muted)]">
                <th className="p-3">Temporada</th>
                <th className="p-3">Año</th>
                <th className="p-3">Fechas</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Actual</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredSeasons.map((season) => (
                <tr
                  key={season.id}
                  className="border-b border-[var(--geo-border)]/40 transition-colors hover:bg-white/[0.03]"
                >
                  <td className="p-3 font-semibold text-[var(--geo-text)]">{season.name}</td>
                  <td className="p-3 text-[var(--geo-text-muted)]">{season.year}</td>
                  <td className="p-3 text-[var(--geo-text-muted)]">{season.startDate} → {season.endDate}</td>
                  <td className="p-3">
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
                  <td className="p-3">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                        season.isCurrent
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : "border-white/20 bg-white/[0.03] text-[var(--geo-text-muted)]"
                      }`}
                    >
                      {season.isCurrent ? "Sí" : "No"}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-end">
                    <button
                      type="button"
                      className="rounded-lg border border-red-500/60 px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/10"
                      onClick={() => {
                        if (!window.confirm(`¿Eliminar temporada ${season.name}?`)) return;
                        deleteMutation.mutate(season.id);
                      }}
                    >
                      Eliminar
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filteredSeasons.length && (
            <p className="mt-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm text-[var(--geo-text-muted)]">
              No hay temporadas que coincidan con la búsqueda.
            </p>
          )}
          </div>
        </section>
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
