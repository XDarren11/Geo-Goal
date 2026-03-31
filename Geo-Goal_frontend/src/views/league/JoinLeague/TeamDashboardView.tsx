import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTeamDashboard } from "@/api/teamAPI";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryVoronoiContainer,
  VictoryTooltip,
  VictoryScatter,
} from "victory";

export default function TeamDashboardView() {
  const { leagueId, teamId } = useParams<{ leagueId: string; teamId: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["teamDashboard", leagueId, teamId],
    queryFn: () => getTeamDashboard(Number(leagueId), Number(teamId)),
    enabled: !!leagueId && !!teamId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-[var(--geo-text-muted)] animate-pulse">Cargando estadísticas del equipo…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center text-red-600">
        No se pudo cargar el dashboard.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <Link
        to="/results"
        className="text-sm text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
      >
        ← Volver a mis torneos
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ChartBarIcon className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-black text-[var(--geo-text)]">
          Rendimiento del Equipo 
        </h1>
      </div>

      {/* === 1. SECCIÓN DE LA GRÁFICA (VICTORY) === */}
      <div className="mt-8 rounded-xl border border-[var(--geo-border)] bg-zinc-900 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-zinc-300 text-center">
          Goles a Favor vs Goles en Contra por Jornada
        </h3>
        
        {data?.chartData && data.chartData.length > 0 ? (
          <div className="mx-auto max-w-3xl">
            
            {/* LEYENDA HECHA CON TAILWIND (A prueba de errores) */}
            <div className="flex items-center justify-center gap-8 mb-2">
              <div className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                <span className="text-xs font-bold text-zinc-400">Goles a Favor (GF)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                <span className="text-xs font-bold text-zinc-400">Goles en Contra (GC)</span>
              </div>
            </div>

            {/* GRÁFICA SIN VICTORY-LEGEND */}
            <VictoryChart
              domainPadding={{ x: 20, y: 10 }}
              height={250}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => `${datum.childName}: ${datum._y}`}
                  labelComponent={
                    <VictoryTooltip
                      flyoutStyle={{ fill: "#27272a", stroke: "#3f3f46", strokeWidth: 1 }}
                      style={{ fill: "#ffffff", fontSize: 10, fontWeight: "bold" }}
                      cornerRadius={6}
                    />
                  }
                />
              }
            >
              <VictoryAxis 
                style={{ axis: { stroke: "#3f3f46" }, tickLabels: { fill: "#a1a1aa", fontSize: 10, padding: 5 }, grid: { stroke: "none" } }} 
              />
              <VictoryAxis 
                dependentAxis 
                tickFormat={(t) => Math.round(t)} 
                style={{ axis: { stroke: "#3f3f46" }, tickLabels: { fill: "#a1a1aa", fontSize: 10, padding: 5 }, grid: { stroke: "#3f3f46", strokeDasharray: "4, 4" } }} 
              />
              
              <VictoryLine 
                name="GF" 
                data={data.chartData} 
                x="round" 
                y="gf" 
                style={{ data: { stroke: "#3b82f6", strokeWidth: 3 } }} 
              />
              <VictoryScatter 
                name="GF" 
                data={data.chartData} 
                x="round" 
                y="gf" 
                size={4} 
                style={{ data: { fill: "#3b82f6" } }} 
              />
              
              <VictoryLine 
                name="GC" 
                data={data.chartData} 
                x="round" 
                y="gc" 
                style={{ data: { stroke: "#ef4444", strokeWidth: 3 } }} 
              />
              <VictoryScatter 
                name="GC" 
                data={data.chartData} 
                x="round" 
                y="gc" 
                size={4} 
                style={{ data: { fill: "#ef4444" } }} 
              />
            </VictoryChart>
          </div>
        ) : (
          <p className="text-center text-zinc-500 py-10">Aún no hay datos suficientes para graficar.</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <div className="rounded-xl border border-[var(--geo-border)] bg-zinc-900/80 p-6 shadow-sm flex flex-col h-full">
          <h4 className="font-black text-geo-green mb-4 text-lg border-b border-zinc-800 pb-2">
            Últimos Resultados
          </h4>
          <div className="flex flex-col gap-3 flex-1">
            {data?.lastMatches && data.lastMatches.length > 0 ? (
              data.lastMatches.map((match: any) => (
                <DashboardMatchCard key={match.id} match={match} />
              ))
            ) : (
              <p className="text-sm text-zinc-500 italic py-4 text-center m-auto">No hay resultados previos.</p>
            )}
          </div>
        </div>
        
        {/* Columna Derecha: Próximos Partidos */}
        <div className="rounded-xl border border-[var(--geo-border)] bg-zinc-900/80 p-6 shadow-sm flex flex-col h-full">
          <h4 className="font-black text-blue-400 mb-4 text-lg border-b border-zinc-800 pb-2">
            Próximos Partidos
          </h4>
          <div className="flex flex-col gap-3 flex-1">
            {data?.upcomingMatches && data.upcomingMatches.length > 0 ? (
              data.upcomingMatches.map((match: any) => (
                <DashboardMatchCard key={match.id} match={match} />
              ))
            ) : (
              <p className="text-sm text-zinc-500 italic py-4 text-center m-auto">No hay partidos programados.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

function DashboardMatchCard({ match }: { match: any }) {
  const getLogoUrl = (team: any) => {
    if (team?.logoUrl) {
      return `http://localhost:4000/uploads/${team.logoUrl}`;
    }
    const initials = team?.name ? team.name.substring(0, 2).toUpperCase() : 'EQ';
    return `https://ui-avatars.com/api/?name=${initials}&background=27272a&color=fff&rounded=true&bold=true`;
  };

  const homeLogo = getLogoUrl(match.homeTeam);
  const awayLogo = getLogoUrl(match.awayTeam);

  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-black/40 p-3 transition-colors hover:border-zinc-700">
      
      <div className="flex flex-1 items-center gap-3">
        <img
          src={homeLogo}
          alt={`Logo ${match.homeTeam?.name}`}
          className="h-10 w-10 shrink-0 rounded-full border border-zinc-700 bg-zinc-800 object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=LC&background=27272a&color=fff&rounded=true`;
          }}
        />
        <span className="font-bold text-sm text-white line-clamp-1">
          {match.homeTeam?.name || "Local"}
        </span>
      </div>

      <div className="px-2 shrink-0 flex flex-col items-center justify-center min-w-[90px]">
        {match.played ? (
          <div className="flex flex-col items-center">
            <span className="rounded border border-zinc-700 bg-zinc-800/80 px-3 py-1 font-mono text-sm font-bold text-white shadow-inner tracking-widest">
              {match.homeScore} - {match.awayScore}
            </span>
            {match.homePenaltiesScore != null && match.awayPenaltiesScore != null && (
              <span className="text-[9px] text-zinc-500 mt-1 font-bold tracking-widest uppercase">
                Pen: {match.homePenaltiesScore}-{match.awayPenaltiesScore}
              </span>
            )}
          </div>
        ) : (
          <div className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-400">
            Pendiente
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 text-right">
        <span className="font-bold text-sm text-white line-clamp-1">
          {match.awayTeam?.name || "Visitante"}
        </span>
        <img
          src={awayLogo}
          alt={`Logo ${match.awayTeam?.name}`}
          className="h-10 w-10 shrink-0 rounded-full border border-zinc-700 bg-zinc-800 object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=VS&background=27272a&color=fff&rounded=true`;
          }}
        />
      </div>

    </div>
  );
}