import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  assignRefereeToMatch,
  getRefereeTodayMatches,
  registerMatchEvent,
  registerTrackingFrame,
  type RefereeAssignment,
} from "@/api/refereeAPI";
import { useAuth } from "@/hooks/useAuth";

const EVENT_OPTIONS = [
  "goal",
  "own_goal",
  "penalty_scored",
  "penalty_missed",
  "yellow_card",
  "red_card",
  "substitution",
  "foul",
  "offside",
  "var_review",
] as const;

export default function RefereeCenterView() {
  const { data: currentUser } = useAuth();
  const role = currentUser?.role;

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ["referee", "today"],
    queryFn: getRefereeTodayMatches,
    enabled: role === "referee",
  });

  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null);
  const [eventType, setEventType] = useState<(typeof EVENT_OPTIONS)[number]>("goal");
  const [assignMatchId, setAssignMatchId] = useState("");
  const [assignRefereeUserId, setAssignRefereeUserId] = useState("");
  const [minute, setMinute] = useState("1");
  const [extraMinute, setExtraMinute] = useState("");
  const [teamId, setTeamId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [metaText, setMetaText] = useState("{}");

  const [timestampMs, setTimestampMs] = useState(String(Date.now()));
  const [period, setPeriod] = useState<"pre" | "1H" | "HT" | "2H" | "ET" | "post" | "">("1H");
  const [ballX, setBallX] = useState("");
  const [ballY, setBallY] = useState("");
  const [ballZ, setBallZ] = useState("");
  const [playersJson, setPlayersJson] = useState("[]");

  const selectedMatch = useMemo(() => {
    return data.find((a) => a.matchId === selectedMatchId) ?? null;
  }, [data, selectedMatchId]);

  const eventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId) throw new Error("Selecciona un partido");

      let metadata: Record<string, unknown> = {};
      try {
        metadata = JSON.parse(metaText || "{}");
      } catch {
        throw new Error("metadata no es JSON válido");
      }

      return registerMatchEvent(selectedMatchId, {
        eventType,
        minute: Number(minute),
        extraMinute: extraMinute ? Number(extraMinute) : null,
        teamId: teamId ? Number(teamId) : null,
        playerId: playerId ? Number(playerId) : null,
        metadata,
      });
    },
    onSuccess: () => {
      alert("Evento registrado");
      refetch();
    },
    onError: (e: any) => {
      alert(e?.response?.data?.error || e?.message || "No se pudo registrar el evento");
    },
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      return assignRefereeToMatch(Number(assignMatchId), {
        refereeUserId: Number(assignRefereeUserId),
        status: "assigned",
      });
    },
    onSuccess: async () => {
      alert("Árbitro asignado");
      await refetch();
    },
    onError: (e: any) => {
      alert(e?.response?.data?.error || e?.message || "No se pudo asignar");
    },
  });

  const trackingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedMatchId) throw new Error("Selecciona un partido");

      let players: Array<Record<string, unknown>> = [];
      try {
        const parsed = JSON.parse(playersJson || "[]");
        if (!Array.isArray(parsed)) throw new Error();
        players = parsed;
      } catch {
        throw new Error("players no es JSON array válido");
      }

      return registerTrackingFrame(selectedMatchId, {
        timestampMs: Number(timestampMs),
        period: period || null,
        ball: {
          x: ballX ? Number(ballX) : undefined,
          y: ballY ? Number(ballY) : undefined,
          z: ballZ ? Number(ballZ) : undefined,
        },
        players,
      });
    },
    onSuccess: () => alert("Tracking enviado"),
    onError: (e: any) => alert(e?.response?.data?.error || e?.message || "No se pudo enviar tracking"),
  });

  return (
    <div className="opacity-0 animate-in-up">
      <h1 className="text-3xl font-black text-[var(--geo-text)]">Centro de Árbitro (Admin Assistant)</h1>
      <p className="mt-2 text-sm text-[var(--geo-text-muted)]">
        {role === "admin"
          ? "Asigna árbitros a los partidos."
          : "Partidos de hoy asignados. Puedes capturar eventos y tracking en vivo."}
      </p>

      {role === "admin" ? (
      <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
        <h2 className="font-bold text-[var(--geo-text)]">Asignar árbitro</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input value={assignMatchId} onChange={(e) => setAssignMatchId(e.target.value)} placeholder="matchId" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
          <input value={assignRefereeUserId} onChange={(e) => setAssignRefereeUserId(e.target.value)} placeholder="refereeUserId" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
          <button
            type="button"
            disabled={!assignMatchId || !assignRefereeUserId || assignMutation.isPending}
            onClick={() => assignMutation.mutate()}
            className="rounded-lg bg-geo-green px-4 py-2 font-bold text-black disabled:opacity-60"
          >
            {assignMutation.isPending ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
      ) : null}

      {role === "referee" ? (
      <>
      <div className="mt-6 rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
        <h2 className="font-bold text-[var(--geo-text)]">Partidos de hoy</h2>
        {isLoading ? (
          <p className="mt-2 text-[var(--geo-text-muted)]">Cargando...</p>
        ) : data.length === 0 ? (
          <p className="mt-2 text-[var(--geo-text-muted)]">No tienes partidos asignados hoy.</p>
        ) : (
          <ul className="mt-3 grid gap-3 md:grid-cols-2">
            {data.map((a: RefereeAssignment) => {
              const active = selectedMatchId === a.matchId;
              return (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMatchId(a.matchId);
                      setTeamId(String(a.match?.homeTeamId ?? ""));
                    }}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      active
                        ? "border-geo-green bg-geo-green/10"
                        : "border-[var(--geo-border)] bg-[var(--geo-bg)] hover:border-geo-green/60"
                    }`}
                  >
                    <p className="font-semibold text-[var(--geo-text)]">
                      {a.match?.homeTeam?.name || "Local"} vs {a.match?.awayTeam?.name || "Visitante"}
                    </p>
                    <p className="text-xs text-[var(--geo-text-muted)]">
                      {a.match?.roundName || "Partido"} · {a.match?.date ? new Date(a.match.date).toLocaleString() : "Sin fecha"}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <h3 className="font-bold text-[var(--geo-text)]">Registrar evento</h3>
          <div className="mt-3 grid gap-3">
            <select value={eventType} onChange={(e) => setEventType(e.target.value as any)} className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2">
              {EVENT_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input value={minute} onChange={(e) => setMinute(e.target.value)} placeholder="Minuto" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <input value={extraMinute} onChange={(e) => setExtraMinute(e.target.value)} placeholder="Extra minute (opcional)" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <input value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="teamId (opcional)" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <input value={playerId} onChange={(e) => setPlayerId(e.target.value)} placeholder="playerId (opcional)" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <textarea value={metaText} onChange={(e) => setMetaText(e.target.value)} rows={4} placeholder='metadata JSON ej. {"assistPlayerId":10}' className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <button
              type="button"
              disabled={!selectedMatch || eventMutation.isPending}
              onClick={() => eventMutation.mutate()}
              className="rounded-lg bg-geo-green px-4 py-2 font-bold text-black disabled:opacity-60"
            >
              {eventMutation.isPending ? "Enviando..." : "Guardar evento"}
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-5">
          <h3 className="font-bold text-[var(--geo-text)]">Registrar tracking frame</h3>
          <div className="mt-3 grid gap-3">
            <input value={timestampMs} onChange={(e) => setTimestampMs(e.target.value)} placeholder="timestampMs" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <select value={period} onChange={(e) => setPeriod(e.target.value as any)} className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2">
              <option value="">period (opcional)</option>
              <option value="pre">pre</option>
              <option value="1H">1H</option>
              <option value="HT">HT</option>
              <option value="2H">2H</option>
              <option value="ET">ET</option>
              <option value="post">post</option>
            </select>
            <div className="grid grid-cols-3 gap-2">
              <input value={ballX} onChange={(e) => setBallX(e.target.value)} placeholder="ballX" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
              <input value={ballY} onChange={(e) => setBallY(e.target.value)} placeholder="ballY" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
              <input value={ballZ} onChange={(e) => setBallZ(e.target.value)} placeholder="ballZ" className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            </div>
            <textarea value={playersJson} onChange={(e) => setPlayersJson(e.target.value)} rows={6} placeholder='players JSON array: [{"userId":1,"teamId":2,"x":31.2,"y":15.4}]' className="rounded-lg border border-[var(--geo-border)] bg-[var(--geo-bg)] px-3 py-2" />
            <button
              type="button"
              disabled={!selectedMatch || trackingMutation.isPending}
              onClick={() => trackingMutation.mutate()}
              className="rounded-lg bg-geo-green px-4 py-2 font-bold text-black disabled:opacity-60"
            >
              {trackingMutation.isPending ? "Enviando..." : "Guardar tracking"}
            </button>
          </div>
        </section>
      </div>
      </>
      ) : null}

      {role !== "admin" && role !== "referee" ? (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
          No tienes permisos para acceder al centro de árbitro.
        </div>
      ) : null}
    </div>
  );
}
