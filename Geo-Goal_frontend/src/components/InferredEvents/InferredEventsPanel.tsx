/**
 * InferredEventsPanel — Fase 7.E
 * Panel admin para revisar, confirmar, editar o rechazar eventos
 * detectados automáticamente por el AI service.
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";

interface InferredEvent {
  id: number;
  eventType: string;
  minute: number;
  confidence: number;
  source: string;
  teamId: number | null;
  xStart: number | null;
  yStart: number | null;
  metadata: {
    requiresReview?: boolean;
    subtype?: string | null;
    signals?: number | null;
    fromTrackerId?: number | null;
    toTrackerId?: number | null;
    fromTeam?: string | null;
    toTeam?: string | null;
  };
}

const EVENT_LABEL: Record<string, string> = {
  goal: "⚽ Gol",
  ball_out: "📤 Balón fuera",
  pass: "↗️ Pase",
  interception: "✋ Interceptación",
};

const CONF_COLOR = (c: number) =>
  c >= 0.75 ? "text-emerald-400" : c >= 0.5 ? "text-yellow-400" : "text-red-400";

interface Props {
  matchId: number;
}

export function InferredEventsPanel({ matchId }: Props) {
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMinute, setEditMinute] = useState<string>("");

  const { data: events = [], isLoading } = useQuery<InferredEvent[]>({
    queryKey: ["inferred-events", matchId],
    queryFn: async () => {
      const { data } = await api.get<InferredEvent[]>(`/public/matches/${matchId}/events/inferred`);
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["inferred-events", matchId] });

  const confirmMut = useMutation({
    mutationFn: (id: number) => api.post(`/public/events/${id}/confirm`),
    onSuccess: invalidate,
  });

  const rejectMut = useMutation({
    mutationFn: (id: number) => api.delete(`/public/events/${id}/reject`),
    onSuccess: invalidate,
  });

  const editMut = useMutation({
    mutationFn: ({ id, minute }: { id: number; minute: number }) =>
      api.patch(`/public/events/${id}`, { minute }),
    onSuccess: () => { setEditingId(null); invalidate(); },
  });

  if (isLoading) return <p className="text-xs text-[var(--geo-text-muted)]">Cargando eventos pendientes...</p>;

  if (!events.length) {
    return (
      <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4 text-center">
        <p className="text-sm text-[var(--geo-text-muted)]">No hay eventos pendientes de revisión.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-400 font-semibold">
        {events.length} evento{events.length !== 1 ? "s" : ""} detectado{events.length !== 1 ? "s" : ""} automáticamente — pendiente{events.length !== 1 ? "s" : ""} de revisión
      </p>

      {events.map((ev) => (
        <div
          key={ev.id}
          className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2"
        >
          {/* Cabecera */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[var(--geo-text)]">
                {EVENT_LABEL[ev.eventType] ?? ev.eventType}
              </span>
              {ev.metadata?.subtype && (
                <span className="text-[10px] text-[var(--geo-text-muted)] bg-white/10 px-1.5 rounded">
                  {ev.metadata.subtype}
                </span>
              )}
            </div>
            <span className={`text-xs font-bold ${CONF_COLOR(ev.confidence)}`}>
              {Math.round(ev.confidence * 100)}% conf.
            </span>
          </div>

          {/* Detalles */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--geo-text-muted)]">
            {editingId === ev.id ? (
              <span className="flex items-center gap-1">
                Min:
                <input
                  type="number"
                  value={editMinute}
                  onChange={(e) => setEditMinute(e.target.value)}
                  className="w-14 rounded border border-[var(--geo-border)] bg-[var(--geo-bg)] px-1 text-xs text-[var(--geo-text)]"
                />
              </span>
            ) : (
              <span>Min {ev.minute}</span>
            )}
            {ev.metadata?.signals != null && <span>Señales: {ev.metadata.signals}/4</span>}
            {ev.metadata?.fromTeam && (
              <span>
                {ev.metadata.fromTeam === "home" ? "Local" : "Visitante"}
                {ev.metadata.toTeam && ev.metadata.toTeam !== ev.metadata.fromTeam
                  ? ` → ${ev.metadata.toTeam === "home" ? "Local" : "Visitante"}`
                  : ""}
              </span>
            )}
            {ev.xStart != null && <span>({ev.xStart?.toFixed(1)}, {ev.yStart?.toFixed(1)})</span>}
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => confirmMut.mutate(ev.id)}
              disabled={confirmMut.isPending}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              ✓ Confirmar
            </button>
            <button
              onClick={() => rejectMut.mutate(ev.id)}
              disabled={rejectMut.isPending}
              className="rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
            >
              ✗ Rechazar
            </button>
            {editingId === ev.id ? (
              <>
                <button
                  onClick={() => editMut.mutate({ id: ev.id, minute: Number(editMinute) })}
                  disabled={editMut.isPending}
                  className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg bg-zinc-700 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-600"
                >
                  Cancelar
                </button>
              </>
            ) : (
              <button
                onClick={() => { setEditingId(ev.id); setEditMinute(String(ev.minute)); }}
                className="rounded-lg bg-zinc-700 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-600"
              >
                ✎ Editar
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

