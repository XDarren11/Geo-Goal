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
        <p className="text-[var(--geo-text-muted)] animate-pulse font-medium">Cargando estadísticas del equipo…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 text-center text-red-600 font-medium">
        No se pudo cargar el dashboard.
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 max-w-6xl mx-auto">
      <Link
        to="/coach/teams"
        className="text-sm font-medium text-[var(--geo-text-muted)] hover:text-geo-green transition-colors"
      >
        &larr; Volver a mis ligas
      </Link>

      <div className="mt-4 flex items-center gap-3">
        <ChartBarIcon className="h-8 w-8 text-geo-green" />
        <h1 className="text-3xl font-black text-[var(--geo-text)] tracking-tight">
          Rendimiento del Equipo 
        </h1>
      </div>

      {/* === 1. SECCIÓN DE LA GRÁFICA === */}
      {/* Aplicamos bg-[var(--geo-bg-card)] y el border dinámico */}
      <div className="mt-8 rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm transition-colors">
        <h3 className="mb-4 text-lg font-bold text-[var(--geo-text)] text-center">
          Goles a Favor vs Goles en Contra por Jornada
        </h3>
        
        {data?.chartData && data.chartData.length > 0 ? (
          <div className="mx-auto max-w-3xl">
            
            {/* LEYENDA (A prueba de errores) */}
            <div className="flex items-center justify-center gap-8 mb-2">
              <div className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                <span className="text-xs font-bold text-[var(--geo-text-muted)] uppercase tracking-wider">Goles a Favor (GF)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="block h-3 w-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                <span className="text-xs font-bold text-[var(--geo-text-muted)] uppercase tracking-wider">Goles en Contra (GC)</span>
              </div>
            </div>

            {/* GRÁFICA */}
            <VictoryChart
              domainPadding={{ x: 20, y: 10 }}
              height={250}
              containerComponent={
                <VictoryVoronoiContainer
                  voronoiDimension="x"
                  labels={({ datum }) => `${datum.childName}: ${datum._y}`}
                  labelComponent={
                    <VictoryTooltip
                      // Tooltip oscuro siempre se ve bien en ambos modos
                      flyoutStyle={{ fill: "#1f2937", stroke: "#374151", strokeWidth: 1 }}
                      style={{ fill: "#ffffff", fontSize: 10, fontWeight: "bold" }}
                      cornerRadius={6}
                    />
                  }
                />
              }
            >
              <VictoryAxis 
                // Usamos gris neutro (#9ca3af) para que contraste en blanco y negro
                style={{ axis: { stroke: "#9ca3af" }, tickLabels: { fill: "#9ca3af", fontSize: 10, padding: 5, fontWeight: "bold" }, grid: { stroke: "none" } }} 
              />
              <VictoryAxis 
                dependentAxis 
                tickFormat={(t) => Math.round(t)} 
                style={{ axis: { stroke: "none" }, tickLabels: { fill: "#9ca3af", fontSize: 10, padding: 5, fontWeight: "bold" }, grid: { stroke: "#9ca3af", strokeDasharray: "4, 4", opacity: 0.3 } }} 
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
          <p className="text-center text-[var(--geo-text-muted)] py-10 font-medium">Aún no hay datos suficientes para graficar.</p>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Columna Izquierda: Últimos Resultados */}
        <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm flex flex-col h-full transition-colors">
          <h4 className="font-black text-geo-green mb-4 text-lg border-b border-[var(--geo-border)] pb-2 uppercase tracking-wide">
            Últimos Resultados
          </h4>
          <div className="flex flex-col gap-3 flex-1">
            {data?.lastMatches && data.lastMatches.length > 0 ? (
              data.lastMatches.map((match: any) => (
                <DashboardMatchCard key={match.id} match={match} />
              ))
            ) : (
              <p className="text-sm text-[var(--geo-text-muted)] italic py-4 text-center m-auto">No hay resultados previos.</p>
            )}
          </div>
        </div>
        
        {/* Columna Derecha: Próximos Partidos */}
        <div className="rounded-2xl border border-[var(--geo-border)] bg-[var(--geo-bg-card)] p-6 shadow-sm flex flex-col h-full transition-colors">
          <h4 className="font-black text-blue-500 mb-4 text-lg border-b border-[var(--geo-border)] pb-2 uppercase tracking-wide">
            Próximos Partidos
          </h4>
          <div className="flex flex-col gap-3 flex-1">
            {data?.upcomingMatches && data.upcomingMatches.length > 0 ? (
              data.upcomingMatches.map((match: any) => (
                <DashboardMatchCard key={match.id} match={match} />
              ))
            ) : (
              <p className="text-sm text-[var(--geo-text-muted)] italic py-4 text-center m-auto">No hay partidos programados.</p>
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
    // Mantenemos un fondo oscuro neutro para los avatares generados, se ve elegante en ambos modos
    return `https://ui-avatars.com/api/?name=${initials}&background=27272a&color=fff&rounded=true&bold=true`;
  };

  const homeLogo = getLogoUrl(match.homeTeam);
  const awayLogo = getLogoUrl(match.awayTeam);

  return (
    // bg-[var(--geo-bg)] nos da el color del fondo principal (que contrasta con la tarjeta)
    <div className="flex items-center justify-between rounded-xl border border-[var(--geo-border)] bg-[var(--geo-bg)] p-3 transition-colors hover:border-geo-green/50">
      
      <div className="flex flex-1 items-center gap-3">
        <img
          src={homeLogo}
          alt={`Logo ${match.homeTeam?.name}`}
          className="h-10 w-10 shrink-0 rounded-full border border-[var(--geo-border)] bg-[var(--geo-bg-card)] object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=LC&background=27272a&color=fff&rounded=true`;
          }}
        />
        <span className="font-bold text-sm text-[var(--geo-text)] line-clamp-1">
          {match.homeTeam?.name || "Local"}
        </span>
      </div>

      <div className="px-2 shrink-0 flex flex-col items-center justify-center min-w-[90px]">
        {match.played ? (
          <div className="flex flex-col items-center">
            <span className="rounded border border-[var(--geo-border)] bg-[var(--geo-bg-card)] px-3 py-1 font-mono text-sm font-black text-[var(--geo-text)] shadow-sm tracking-widest">
              {match.homeScore} - {match.awayScore}
            </span>
            {match.homePenaltiesScore != null && match.awayPenaltiesScore != null && (
              <span className="text-[9px] text-[var(--geo-text-muted)] mt-1 font-bold tracking-widest uppercase">
                Pen: {match.homePenaltiesScore}-{match.awayPenaltiesScore}
              </span>
            )}
          </div>
        ) : (
          // Estilo especial para partidos pendientes usando tonos azules adaptables
          <div className="rounded-md border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-500">
            Pendiente
          </div>
        )}
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 text-right">
        <span className="font-bold text-sm text-[var(--geo-text)] line-clamp-1">
          {match.awayTeam?.name || "Visitante"}
        </span>
        <img
          src={awayLogo}
          alt={`Logo ${match.awayTeam?.name}`}
          className="h-10 w-10 shrink-0 rounded-full border border-[var(--geo-border)] bg-[var(--geo-bg-card)] object-cover shadow-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=VS&background=27272a&color=fff&rounded=true`;
          }}
        />
      </div>

    </div>
  );
}