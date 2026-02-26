interface TeamPair {
    home: number;
    away: number;
}

export class MatchGenerator {

    // 1. ALGORITMO ROUND ROBIN (Todos contra Todos)
    static generateRoundRobin(teamIds: number[]) {
        const matches: { home: number, away: number, round: string }[] = [];
        
        // Si es impar, agregamos un "bye" (descanso) ficticio (-1)
        if (teamIds.length % 2 !== 0) {
            teamIds.push(-1); 
        }

        const numTeams = teamIds.length;
        const numRounds = numTeams - 1; // En liga de 10, juegas 9 fechas
        const half = numTeams / 2;

        const teamsCopy = [...teamIds]; // Copia para rotar

        for (let round = 0; round < numRounds; round++) {
            const roundName = `Jornada ${round + 1}`;

            for (let i = 0; i < half; i++) {
                const teamA = teamsCopy[i];
                const teamB = teamsCopy[numTeams - 1 - i];

                // Si ninguno es el "bye" (-1), guardamos el partido
                if (teamA !== -1 && teamB !== -1) {
                    // Alternamos localía para que sea justo
                    if (round % 2 === 0) {
                        matches.push({ home: teamA, away: teamB, round: roundName });
                    } else {
                        matches.push({ home: teamB, away: teamA, round: roundName });
                    }
                }
            }

            // ROTACIÓN DE EQUIPOS (Dejamos el primero fijo y rotamos el resto)
            // [0, 1, 2, 3] -> [0, 3, 1, 2]
            teamsCopy.splice(1, 0, teamsCopy.pop()!);
        }

        return matches;
    }

    // 2. ALGORITMO ELIMINACIÓN DIRECTA (Copa)
    static generateKnockout(teamIds: number[]) {
        const matches: { home: number, away: number, round: string }[] = [];
        
        // Barajamos los equipos al azar (Sorteo)
        const shuffled = teamIds.sort(() => 0.5 - Math.random());
        
        let roundName = "Ronda Eliminatoria";
        if (shuffled.length === 2) roundName = "Gran Final";
        if (shuffled.length === 4) roundName = "Semifinales";
        if (shuffled.length === 8) roundName = "Cuartos de Final";

        for (let i = 0; i < shuffled.length; i += 2) {
            // Si sobra uno al final (impar), pasa directo (bye)
            if (i + 1 < shuffled.length) {
                matches.push({
                    home: shuffled[i],
                    away: shuffled[i + 1],
                    round: roundName
                });
            }
        }

        return matches;
    }
}