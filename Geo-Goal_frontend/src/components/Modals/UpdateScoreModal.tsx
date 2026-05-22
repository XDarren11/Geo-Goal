import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { updateMatchScore, getMatchPlayers } from "@/api/leagueAPI"; // 👈 Asegúrate de importar la función para obtener jugadores/equipos
import { toast } from "react-toastify";
import AdminMatchStats from '@/components/TableGoal/AdminMatchStats'; 
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

  // === NUEVO: OBTENER JUGADORES ===
  // Nota: Deberás asegurarte de tener un endpoint que devuelva los jugadores de un partido o liga.
  // Si tienes 'getTeamPlayers', puedes llamarlo aquí. Por simplicidad, asumo que tienes una función 
  // que te devuelve a los convocados o la lista completa de la liga.
  const { data: players } = useQuery({
    queryKey: ["matchPlayers", match?.id],
    queryFn: () => getMatchPlayers(match?.id), // 👈 Usamos la función real
    enabled: !!match?.id && isOpen,
  });

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
      hasTieBreaker && homePenalties !== "" ? Number(homePenalties) : undefined,
      hasTieBreaker && awayPenalties !== "" ? Number(awayPenalties) : undefined
    ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixture", leagueId] });
      queryClient.invalidateQueries({ queryKey: ["league", leagueId] }); 
      toast.success("Resultado guardado correctamente");
      // Opcional: No cerramos el modal aquí para que el admin pueda registrar los goleadores después de guardar el marcador
    },
    onError: (e: any) => toast.error(e.message || "Error al actualizar"),
  });

  if (!isOpen || !match) return null;

  return (
    // Se aumentó un poco el max-w-md a max-w-2xl para que quepa bien la lista de jugadores
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl my-8">
        <h3 className="text-xl font-bold text-geo-green mb-6 text-center">Actualizar Resultado</h3>

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
              className="w-16 rounded-lg bg-zinc-800 p-2 text-center text-2xl font-black text-white outline-none border border-zinc-700 focus:border-geo-green focus:ring-1 focus:ring-geo-green transition-all"
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
              className="w-16 rounded-lg bg-zinc-800 p-2 text-center text-2xl font-black text-white outline-none border border-zinc-700 focus:border-geo-green focus:ring-1 focus:ring-geo-green transition-all"
            />
          </div>
        </div>

        {/* === SECCIÓN DE DESEMPATE (PENALES) === */}
        <div className="mt-8 border-t border-zinc-800 pt-6 flex flex-col items-center animate-in fade-in duration-300">
          <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm font-bold text-zinc-400 transition-colors cursor-pointer hover:bg-zinc-800 hover:text-zinc-300 select-none">
            <input
              type="checkbox"
              checked={hasTieBreaker}
              onChange={(e) => {
                setHasTieBreaker(e.target.checked);
                if (!e.target.checked) {
                  setHomePenalties("");
                  setAwayPenalties("");
                }
              }}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 accent-geo-green"
            />
            ¿Registrar tanda de penales?
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
                  className="w-14 rounded bg-zinc-800 p-1 text-center text-lg font-bold text-geo-green outline-none border border-zinc-700 focus:border-geo-green"
                />
                <span className="text-sm font-bold text-zinc-500">PEN</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={awayPenalties}
                  onChange={(e) => setAwayPenalties(e.target.value)}
                  className="w-14 rounded bg-zinc-800 p-1 text-center text-lg font-bold text-geo-green outline-none border border-zinc-700 focus:border-geo-green"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* === BOTÓN PARA GUARDAR MARCADOR === */}
        <div className="mt-6 flex justify-end gap-3 mb-6 border-b border-zinc-800 pb-6">
           <button
            onClick={() => updateScoreMutation.mutate()}
            disabled={
              updateScoreMutation.isPending || 
              homeScore === "" || 
              awayScore === "" || 
              (hasTieBreaker && (homePenalties === "" || awayPenalties === ""))
            }
            className="w-full rounded-lg bg-geo-green/20 border border-geo-green px-6 py-2 text-sm font-black text-geo-green transition-colors hover:bg-geo-green hover:text-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateScoreMutation.isPending ? "Guardando..." : "Guardar Marcador Global"}
          </button>
        </div>

        {/* === NUEVO: SECCIÓN DE GOLEADORES === */}
        {players && (
            <div className="animate-in fade-in duration-500">
                <AdminMatchStats 
                    match={match} 
                    leagueId={leagueId} 
                    players={players} 
                />
            </div>
        )}

        {/* === BOTONES FINALES === */}
        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-6 py-2 text-sm font-bold text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  );
}