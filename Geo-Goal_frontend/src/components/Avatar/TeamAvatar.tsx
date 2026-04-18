

interface TeamAvatarProps {
    name: string;
    logoUrl?: string;
    id: number;
}

export const TeamAvatar = ({ name, logoUrl, id }: TeamAvatarProps) => {
    
    const getInitials = (teamName: string) => {
        if (!teamName) return '';
        const words = teamName.split(' ').filter(w => w.length > 0);
        const initials = words.map(w => w[0]).join('');
        return initials.substring(0, 2).toUpperCase();
    }

    const getBackgroundColorClass = (teamId: number) => {
        const colors = [
            'bg-slate-800', // Un gris oscuro como tu ejemplo
            'bg-indigo-600', 
            'bg-emerald-600', 
            'bg-red-600', 
            'bg-orange-600'
        ];
        return colors[teamId % colors.length];
    }

    return (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-4 overflow-hidden shadow-inner ${!logoUrl ? `${getBackgroundColorClass(id)}` : 'bg-gray-200'}`}>
            
            {logoUrl ? (
                <img 
                    src={logoUrl} 
                    alt={`Logo de ${name}`} 
                    className="w-full h-full object-cover" 
                />
            ) : (
                // Caso B: Mostrar el avatar con las iniciales
                <span className="font-bold text-slate-100 text-xl uppercase tracking-wider">
                    {getInitials(name)}
                </span>
            )}
        </div>
    );
};