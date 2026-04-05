import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateMatchScore } from "@/api/leagueAPI";
import { toast } from "react-toastify";

interface UpdateScoreModalProps {
  match: any;
  leagueId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function UpdateScoreModal({ match, leagueId, isOpen, onClose }: UpdateScoreModalProps) {
  const queryClient = useQueryClient();
  
  const [homeScore, setHomeScore] = useState<number | string>(match?.homeScore ?? "");
  const [awayScore, setAwayScore] = useState<number | string>(match?.awayScore ?? "");
  
  const [hasTieBreaker, setHasTieBreaker] = useState<boolean>(
    match?.homePenaltiesScore !== null && match?.homePenaltiesScore !== undefined
  );
  
  const [homePenalties, setHomePenalties] = useState<number | string>(match?.homePenaltiesScore ?? "");
  const [awayPenalties, setAwayPenalties] = useState<number | string>(match?.awayPenaltiesScore ?? "");

  const isDraw = homeScore !== "" && awayScore !== "" && Number(homeScore) === Number(awayScore);
  
  // NUEVO: Verificamos si el partido ya fue jugado
  const isAlreadyPlayed = match?.played === true;

  useEffect(() => {
    if (match) {
      setHomeScore(match.homeScore ?? "");
      setAwayScore(match.awayScore ?? "");
      setHomePenalties(match.homePenaltiesScore ?? "");
      setAwayPenalties(match.awayPenaltiesScore ?? "");
      
      const teniaPenales = match.homePenaltiesScore !== null && match.homePenaltiesScore !== undefined;
      setHasTieBreaker(teniaPenales);
    }
  }, [match]);

  const updateScoreMutation = useMutation({
    mutationFn: () => updateMatchScore(
      match.id, 
      Number(homeScore), 
      Number(awayScore),
      isDraw && hasTieBreaker && homePenalties !== "" ? Number(homePenalties) : undefined,
      isDraw && hasTieBreaker && awayPenalties !== "" ? Number(awayPenalties) : undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixture", leagueId] });
      toast.success("Resultado guardado correctamente");
      onClose();
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });

  if (!isOpen || !match) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl">
        <h3 className="text-xl font-bold text-geo-green mb-4 text-center">Actualizar Resultado</h3>
        
        {/* NUEVO: Mensaje de advertencia si ya se jugó */}
        {isAlreadyPlayed && (
          <div className="mb-6 rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3 text-center text-sm font-medium text-yellow-500">
            Este partido ya tiene un resultado final y no puede ser modificado.
          </div>
        )}

        {/* === MARCADOR REGULAR === */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-1 flex-col items-center">
            <span className="text-sm font-bold text-zinc-300 mb-2 line-clamp-1 text-center">
              {match.homeTeam?.name || "Local"}
            </span>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={(e) => setHomeScore(e.target.value)}
              disabled={isAlreadyPlayed} // Bloqueamos el input
              className="w-16 rounded-lg bg-zinc-800 p-2 text-center text-2xl font-black text-white outline-none border border-zinc-700 focus:border-geo-green focus:ring-1 focus:ring-geo-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <span className="text-3xl font-black text-zinc-600 mt-6">-</span>
          <div className="flex flex-1 flex-col items-center">
            <span className="text-sm font-bold text-zinc-300 mb-2 line-clamp-1 text-center">
              {match.awayTeam?.name || "Visitante"}
            </span>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={(e) => setAwayScore(e.target.value)}
              disabled={isAlreadyPlayed} // Bloqueamos el input
              className="w-16 rounded-lg bg-zinc-800 p-2 text-center text-2xl font-black text-white outline-none border border-zinc-700 focus:border-geo-green focus:ring-1 focus:ring-geo-green transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* === SECCIÓN DE DESEMPATE === */}
        {isDraw && (
          <div className="mt-6 flex flex-col items-center animate-in fade-in duration-300">
            <label className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-bold text-zinc-400 transition-colors ${isAlreadyPlayed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-zinc-800 hover:text-zinc-300 select-none'}`}>
              <input
                type="checkbox"
                checked={hasTieBreaker}
                onChange={(e) => setHasTieBreaker(e.target.checked)}
                disabled={isAlreadyPlayed} // Bloqueamos el checkbox
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-geo-green"
              />
              ¿Hubo desempate por penales?
            </label>

            {hasTieBreaker && (
              <div className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 animate-in slide-in-from-top-4 duration-300">
                <p className="mb-3 text-center text-xs font-bold uppercase tracking-widest text-zinc-500">
                  Marcador de Penales
                </p>
                <div className="flex items-center justify-center gap-6">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={homePenalties}
                    onChange={(e) => setHomePenalties(e.target.value)}
                    disabled={isAlreadyPlayed} // Bloqueamos el input
                    className="w-14 rounded bg-zinc-800 p-1 text-center text-lg font-bold text-geo-green outline-none border border-zinc-700 focus:border-geo-green disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span className="text-sm font-bold text-zinc-500">PEN</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={awayPenalties}
                    onChange={(e) => setAwayPenalties(e.target.value)}
                    disabled={isAlreadyPlayed} // Bloqueamos el input
                    className="w-14 rounded bg-zinc-800 p-1 text-center text-lg font-bold text-geo-green outline-none border border-zinc-700 focus:border-geo-green disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* === BOTONES === */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-bold text-zinc-400 transition-colors hover:text-white"
          >
            {isAlreadyPlayed ? "Cerrar" : "Cancelar"}
          </button>
          <button
            onClick={() => updateScoreMutation.mutate()}
            disabled={
              isAlreadyPlayed || 
              updateScoreMutation.isPending || 
              homeScore === "" || 
              awayScore === "" || 
              (isDraw && hasTieBreaker && (homePenalties === "" || awayPenalties === ""))
            }
            className="rounded-lg bg-geo-green px-6 py-2 text-sm font-black tex t-black transition-colors hover:bg-geo-green-hover disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateScoreMutation.isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}