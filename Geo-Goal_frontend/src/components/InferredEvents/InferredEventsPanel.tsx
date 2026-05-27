/**
 * InferredEventsPanel — Fase 7.E
 *
 * Timeline editable de eventos detectados por la IA.
 * El admin puede:
 *   - ✓ Confirmar (acepta tal cual, queda como source="manual")
 *   - ✗ Rechazar (elimina el evento)
 *   - ✎ Editar (cambia eventType, jugador, minute, outcome)
 *
 * Eventos agrupados por confianza:
 *   - 🟢 Alta confianza (≥60%): probablemente correctos
 *   - 🟡 Baja confianza (<60%): revisar primero, más probable que sean errores
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInferredEvents,
  confirmInferredEvent,
  rejectInferredEvent,
  updateInferredEvent,
  type InferredEvent,
} from "@/api/publicAPI";

// ─── Catálogo de event types (todos los del enum del backend) ──────────────

const EVENT_LABEL: Record<string, string> = {
  goal: "⚽ Gol",
  own_goal: "⚽ Autogol",
  penalty_scored: "⚽ Penal anotado",
  penalty_missed: "✗ Penal fallado",
  pass: "↗ Pase",
  key_pass: "🔑 Pase clave",
  shot: "🎯 Tiro",
  tackle: "🦵 Entrada",
  recovery: "♻ Recuperación",
  interception: "✋ Interceptación",
  clearance: "🛡 Despeje",
  dribble: "💨 Regate",
  cross: "↘ Cross",
  corner_won: "🚩 Esquina",
  throw_in: "🤾 Saque banda",
  goal_kick: "🦶 Saque meta",
  ball_out: "📤 Balón fuera",
  yellow_card: "🟨 Amarilla",
  red_card: "🟥 Roja",
  substitution: "🔄 Sustitución",
  foul: "⚠ Falta",
  offside: "🚫 Fuera de juego",
  var_review: "📺 VAR",
};

const ALL_EVENT_TYPES = Object.keys(EVENT_LABEL);

// ─── Helpers visuales ──────────────────────────────────────────────────────

function confColor(c: number): string {
  if (c >= 0.75) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
  if (c >= 0.5) return "text-amber-400 border-amber-500/40 bg-amber-500/10";
  return "text-red-400 border-red-500/40 bg-red-500/10";
}

function formatMinute(minute: number, extraMinute?: number | null): string {
  return extraMinute ? `${minute}'+${extraMinute}` : `${minute}'`;
}

// ─── Sub-componente: una fila editable ─────────────────────────────────────

function EventRow({
  ev,
  matchId,
  onConfirm,
  onReject,
  onUpdate,
  busy,
}: {
  ev: InferredEvent;
  matchId: number;
  onConfirm: (id: number) => void;
  onReject: (id: number) => void;
  onUpdate: (id: number, changes: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draftType, setDraftType] = useState(ev.eventType);
  const [draftMinute, setDraftMinute] = useState(String(ev.minute));
  const [draftOutcome, setDraftOutcome] = useState(ev.outcome ?? "");

  const meta = (ev.metadata ?? {}) as Record<string, unknown>;
  const playerName = ev.player?.name ?? (ev.playerId ? `#${ev.playerId}` : "—");
  const relatedName = ev.relatedPlayer?.name ?? (ev.relatedPlayerId ? `#${ev.relatedPlayerId}` : null);
  const teamName = ev.team?.name ?? (meta.teamSide ? (meta.teamSide === "home" ? "Local" : "Visitante") : "—");

  const save = () => {
    onUpdate(ev.id, {
      eventType: draftType,
      minute: Number(draftMinute),
      outcome: draftOutcome || null,
    });
    setEditing(false);
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 ${confColor(ev.confidence)}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {editing ? (
            <select
              value={draftType}
              onChange={(e) => setDraftType(e.target.value)}
              className="rounded bg-[var(--geo-bg)] border border-[var(--geo-border)] text-sm px-2 py-1"
            >
              {ALL_EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{EVENT_LABEL[t] ?? t}</option>
              ))}
            </select>
          ) : (
            <span className="text-sm font-bold">{EVENT_LABEL[ev.eventType] ?? ev.eventType}</span>
          )}
          {editing ? (
            <input
              type="number"
              value={draftMinute}
              onChange={(e) => setDraftMinute(e.target.value)}
              className="w-16 rounded bg-[var(--geo-bg)] border border-[var(--geo-border)] text-sm px-2 py-1"
            />
          ) : (
            <span className="text-xs text-[var(--geo-text-muted)]">{formatMinute(ev.minute)}</span>
          )}
        </div>
        <span className="text-xs font-bold">{Math.round(ev.confidence * 100)}% conf.</span>
      </div>

      {/* Detalles */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--geo-text-muted)]">
        <span>👕 {teamName}</span>
        <span>👤 {playerName}{relatedName ? ` → ${relatedName}` : ""}</span>
        {typeof meta.signals === "number" && <span>🔍 {meta.signals} señales</span>}
        {typeof meta.ballSpeedMs === "number" && <span>⚡ {meta.ballSpeedMs} m/s</span>}
        {typeof meta.durationS === "number" && <span>⏱ {meta.durationS}s</span>}
        {typeof meta.pauseDurationS === "number" && <span>⏸ {meta.pauseDurationS}s</span>}
        {ev.xStart != null && ev.yStart != null && (
          <span>📍 ({ev.xStart.toFixed(0)}, {ev.yStart.toFixed(0)})</span>
        )}
      </div>

      {/* Edición extra (solo en modo editar) */}
      {editing && (
        <div className="flex gap-2 items-center">
          <span className="text-xs text-[var(--geo-text-muted)]">Outcome:</span>
          <select
            value={draftOutcome}
            onChange={(e) => setDraftOutcome(e.target.value)}
            className="rounded bg-[var(--geo-bg)] border border-[var(--geo-border)] text-xs px-2 py-1"
          >
            <option value="">— ninguno —</option>
            <option value="complete">complete</option>
            <option value="success">success</option>
            <option value="failed">failed</option>
            <option value="on_target">on_target</option>
            <option value="off_target">off_target</option>
            <option value="saved">saved</option>
            <option value="goal">goal</option>
          </select>
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-2 pt-1">
        {editing ? (
          <>
            <button
              onClick={save}
              disabled={busy}
              className="rounded bg-blue-600 px-3 py-1 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              💾 Guardar
            </button>
            <button
              onClick={() => setEditing(false)}
              className="rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-600"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => onConfirm(ev.id)}
              disabled={busy}
              className="rounded bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              ✓ Confirmar
            </button>
            <button
              onClick={() => setEditing(true)}
              disabled={busy}
              className="rounded bg-zinc-700 px-3 py-1 text-xs font-bold text-white hover:bg-zinc-600 disabled:opacity-50"
            >
              ✎ Editar
            </button>
            <button
              onClick={() => onReject(ev.id)}
              disabled={busy}
              className="rounded bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
            >
              ✗ Rechazar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────

export function InferredEventsPanel({ matchId }: { matchId: number }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "low" | "high">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["inferred-events", matchId],
    queryFn: () => getInferredEvents(matchId),
    refetchInterval: 30_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["inferred-events", matchId] });

  const confirmMut = useMutation({
    mutationFn: (id: number) => confirmInferredEvent(id),
    onSuccess: invalidate,
  });
  const rejectMut = useMutation({
    mutationFn: (id: number) => rejectInferredEvent(id),
    onSuccess: invalidate,
  });
  const updateMut = useMutation({
    mutationFn: ({ id, changes }: { id: number; changes: Record<string, unknown> }) =>
      updateInferredEvent(id, changes as never),
    onSuccess: invalidate,
  });

  const busy = confirmMut.isPending || rejectMut.isPending || updateMut.isPending;

  if (isLoading) {
    return <p className="text-xs text-[var(--geo-text-muted)]">Cargando eventos pendientes...</p>;
  }
  if (!data || data.pendingCount === 0) {
    return (
      <div className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-4 text-center">
        <p className="text-sm text-[var(--geo-text-muted)]">
          {data?.totalInferred
            ? `Sin eventos pendientes (${data.autoAppliedCount} ya aplicados automáticamente).`
            : "No hay eventos detectados por la IA para este partido."}
        </p>
      </div>
    );
  }

  const eventsToShow =
    filter === "high" ? data.pendingByConfidence.high :
    filter === "low" ? data.pendingByConfidence.low :
    data.pending;

  return (
    <div className="space-y-4">
      {/* Header con stats */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-lg font-bold text-[var(--geo-text)]">Eventos detectados</h3>
          <p className="text-xs text-[var(--geo-text-muted)]">
            {data.pendingCount} pendientes · {data.autoAppliedCount} aplicados auto · {data.totalInferred} totales
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`rounded px-2 py-1 ${filter === "all" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
          >
            Todos ({data.pendingCount})
          </button>
          <button
            onClick={() => setFilter("low")}
            className={`rounded px-2 py-1 ${filter === "low" ? "bg-red-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
          >
            🟡 Baja conf ({data.pendingByConfidence.low.length})
          </button>
          <button
            onClick={() => setFilter("high")}
            className={`rounded px-2 py-1 ${filter === "high" ? "bg-emerald-600 text-white" : "bg-zinc-700 text-zinc-300"}`}
          >
            🟢 Alta conf ({data.pendingByConfidence.high.length})
          </button>
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
        {eventsToShow.map((ev) => (
          <EventRow
            key={ev.id}
            ev={ev}
            matchId={matchId}
            onConfirm={confirmMut.mutate}
            onReject={rejectMut.mutate}
            onUpdate={(id, changes) => updateMut.mutate({ id, changes })}
            busy={busy}
          />
        ))}
        {eventsToShow.length === 0 && (
          <p className="text-xs text-[var(--geo-text-muted)] text-center py-4">
            Sin eventos en esta categoría.
          </p>
        )}
      </div>
    </div>
  );
}
