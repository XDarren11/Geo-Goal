import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMatchSchedule } from "@/api/leagueAPI";
import { toast } from "react-toastify";
import { getApiErrorMessage } from "@/utils/getApiErrorMessage";

interface UpdateScheduleModalProps {
  match: any;
  leagueId: number;
  isOpen: boolean;
  onClose: () => void;
}

function toLocalDateTimeInput(value?: string | null) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function UpdateScheduleModal({ match, leagueId, isOpen, onClose }: UpdateScheduleModalProps) {
  const queryClient = useQueryClient();
  const [dateTime, setDateTime] = useState("");
  const isPastMatch = Boolean(match?.date && new Date(match.date).getTime() < Date.now());

  useEffect(() => {
    if (match) {
      setDateTime(toLocalDateTimeInput(match.date));
    }
  }, [match]);

  const isoDate = useMemo(() => {
    if (!dateTime) return "";
    const d = new Date(dateTime);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString();
  }, [dateTime]);

  const mutation = useMutation({
    mutationFn: () => updateMatchSchedule(match.id, isoDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixture", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["matches", leagueId] });
      toast.success("Partido programado correctamente");
      onClose();
    },
    onError: (e: any) => toast.error(getApiErrorMessage(e, "No se pudo programar el partido")),
  });

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-geo-green mb-2 text-center">Programar partido</h3>
        <p className="text-center text-sm text-zinc-400 mb-6">
          {match.homeTeam?.name ?? "Local"} vs {match.awayTeam?.name ?? "Visitante"}
        </p>

        <label className="block text-sm font-semibold text-zinc-300 mb-2">
          Fecha y hora del partido
        </label>
        <input
          type="datetime-local"
          value={dateTime}
          onChange={(e) => setDateTime(e.target.value)}
          disabled={isPastMatch}
          className="w-full rounded-lg bg-zinc-800 p-3 text-white outline-none border border-zinc-700 focus:border-geo-green focus:ring-1 focus:ring-geo-green"
        />

        {isPastMatch ? (
          <p className="mt-3 text-xs text-yellow-500">
            Este partido ya pasó. No se permite cambiar su fecha.
          </p>
        ) : (
          <p className="mt-3 text-xs text-zinc-500">
            Al guardar, se notifica a entrenadores, jugadores y árbitro asignado.
          </p>
        )}

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-bold text-zinc-400 transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={isPastMatch || mutation.isPending || !isoDate}
            className="rounded-lg bg-geo-green px-6 py-2 text-sm font-black text-black transition-colors hover:bg-geo-green-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
