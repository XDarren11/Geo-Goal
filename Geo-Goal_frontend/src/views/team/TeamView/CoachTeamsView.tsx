import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { getActiveLeagues } from '@/api/teamAPI';
import { TeamAvatar } from '@/components/Avatar/TeamAvatar';

// Interfaz para el Equipo
interface Team {
    id: number;
    name: string;
    logoUrl?: string; 
}

export default function CoachTeamsView() {
    const [leagues, setLeagues] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLigas = async () => {
            try {
                const data = await getActiveLeagues();
                setLeagues(data);
            } catch (error) {
                console.error("Error al cargar ligas", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLigas();
    }, []);

    if (loading) return <div className="p-10 text-center text-slate-600 font-semibold">Cargando tus equipos...</div>;

    return (
        <div className="min-h-screen bg-green-50/30 p-8 relative">
            
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(to_right,#e5e7eb_1px,transparent_1px)] bg-[size:4rem_100%] opacity-40"></div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="mb-10">
                    <Link to="/" className="text-xs text-gray-500 hover:text-gray-800 mb-4 inline-block font-medium">
                        &larr; Inicio
                    </Link>
                    <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Mis Equipos y Ligas</h1>
                    <p className="text-gray-600 text-sm">Selecciona uno de tus equipos para ver su panel de rendimiento.</p>
                </div>
                
                {leagues.length === 0 ? (
                    <p className="text-slate-600 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm inline-block">
                        No tienes equipos inscritos en ninguna liga actualmente.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {leagues.map((league) => (
                            <div key={league.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow">
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="pr-4">
                                        <h2 className="text-green-500 font-black text-lg uppercase tracking-wide leading-tight">
                                            {league.name}
                                        </h2>
                                        <p className="text-gray-500 text-xs mt-2 font-medium">Torneo Activo</p>
                                    </div>
                                    <ChartBarIcon className="w-6 h-6 text-gray-500 shrink-0" />
                                </div>
                                
                                {/* Separador */}
                                <div className="flex-grow"></div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400 font-bold mb-3">Tus Equipos</p>
                                    
                                    {league.teams.map((team: Team) => (
                                        <Link 
                                            key={team.id}
                                            to={`/leagues/${league.id}/teams/${team.id}/dashboard`}
                                            className="group flex flex-col p-3 rounded-xl hover:bg-green-50/50 transition-colors border border-transparent hover:border-green-100"
                                        >
                                            <div className="flex items-center">
                                                {/* Mini Avatar */}
                                                <div className="scale-75 origin-left -my-2 mr-1">
                                                    <TeamAvatar name={team.name} logoUrl={team.logoUrl} id={team.id} />
                                                </div>
                                                <span className="font-bold text-gray-700 text-sm group-hover:text-gray-900 transition-colors">
                                                    {team.name}
                                                </span>
                                            </div>
                                            
                                            <span className="text-green-500 font-bold text-xs mt-3 flex items-center group-hover:translate-x-1 transition-transform">
                                                Ver estadísticas &rarr;
                                            </span>
                                        </Link>
                                    ))}
                                </div>

                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}