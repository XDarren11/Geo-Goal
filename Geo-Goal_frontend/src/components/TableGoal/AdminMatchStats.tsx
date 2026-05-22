import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updatePlayerMatchGoals } from "@/api/leagueAPI";
import { toast } from "react-toastify";
import type { Match } from "@/types";

interface Player {
  id: number;
  name: string;
  teamId: number;
  // Agrega otros campos de tu interfaz Player si es necesario
}

interface AdminMatchStatsProps {
  match: Match;
  leagueId: number;
  players: Player[]; // La lista de jugadores convocados para este partido
}

export default function AdminMatchStats({ match, leagueId, players }: AdminMatchStatsProps) {
  const queryClient = useQueryClient();
  
  // Estado para manejar los inputs de goles de forma individual por jugador
  // Ejemplo: { 5: "2", 12: "1" } -> El jugador con ID 5 metió 2 goles.
  const [goalsInput, setGoalsInput] = useState<{ [playerId: number]: string }>({});

  const mutation = useMutation({
    mutationFn: ({ teamId, playerId, goals }: { teamId: number, playerId: number, goals: number }) => 
      updatePlayerMatchGoals(match.id, teamId, playerId, goals),
    onSuccess: () => {
      toast.success("¡Goles del jugador registrados!");
      // 🚀 MAGIA PURA: Esto obliga a la tabla general de goleo a recargarse solita
      queryClient.invalidateQueries({ queryKey: ["topScorers", leagueId] }); 
    },
    onError: (error: any) => {
      toast.error(error?.message || "Hubo un error al guardar los goles");
    }
  });

  const handleSaveGoals = (playerId: number, teamId: number) => {
    const goals = Number(goalsInput[playerId]);
    // Validamos que sea un número válido y mayor o igual a 0
    if (!isNaN(goals) && goals >= 0) {
      mutation.mutate({ teamId, playerId, goals });
    } else {
      toast.warning("Ingresa una cantidad de goles válida");
    }
  };

  // Separamos a los jugadores por equipo para que sea más fácil para el admin
  const homePlayers = players.filter(p => p.teamId === match.homeTeam?.id);
  const awayPlayers = players.filter(p => p.teamId === match.awayTeam?.id);

  if (!players || players.length === 0) {
    return (
      <div className="mt-4 p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-500 text-sm">
        No hay jugadores registrados en los equipos para este partido.
      </div>
    );
  }

  return (
    <div className="mt-6 p-5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-inner">
      <h3 className="text-lg font-bold text-geo-green mb-4 text-center">
        ⚽ Registro de Goleadores
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* COLUMNA LOCAL */}
        <div className="space-y-3">
          <div className="border-b border-zinc-700 pb-2 mb-3">
            <span className="text-sm font-black text-zinc-300 uppercase tracking-wider">
              Local: {match.homeTeam?.name}
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {homePlayers.map(player => (
              <PlayerGoalInput 
                key={player.id} 
                player={player} 
                goalsValue={goalsInput[player.id] ?? ""}
                onChange={(val:string) => setGoalsInput(prev => ({ ...prev, [player.id]: val }))}
                onSave={() => handleSaveGoals(player.id, player.teamId)}
                isLoading={mutation.isPending}
              />
            ))}
          </div>
        </div>

        {/* COLUMNA VISITANTE */}
        <div className="space-y-3">
          <div className="border-b border-zinc-700 pb-2 mb-3">
            <span className="text-sm font-black text-zinc-300 uppercase tracking-wider">
              Visitante: {match.awayTeam?.name}
            </span>
          </div>
          
          <div className="max-h-64 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
            {awayPlayers.map(player => (
              <PlayerGoalInput 
                key={player.id} 
                player={player} 
                goalsValue={goalsInput[player.id] ?? ""}
                onChange={(val:string) => setGoalsInput(prev => ({ ...prev, [player.id]: val }))}
                onSave={() => handleSaveGoals(player.id, player.teamId)}
                isLoading={mutation.isPending}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-componente para mantener el código limpio
function PlayerGoalInput({ player, goalsValue, onChange, onSave, isLoading }: any) {
  return (
    <div className="flex items-center justify-between bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50 hover:border-geo-green/30 transition-colors">
      <span className="text-sm font-semibold text-zinc-300 truncate pr-2">
        {player.name}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <input
          type="number"
          min="0"
          placeholder="0"
          value={goalsValue}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-8 bg-zinc-950 text-geo-green text-center font-bold rounded-md border border-zinc-600 focus:border-geo-green focus:ring-1 focus:ring-geo-green outline-none"
        />
        <button
          onClick={onSave}
          disabled={isLoading || goalsValue === ""}
          className="h-8 px-3 bg-geo-green text-black rounded-md text-xs font-black hover:bg-geo-green-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? "..." : "✓"}
        </button>
      </div>
    </div>
  );
}