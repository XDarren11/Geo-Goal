import { Match } from '../models/Match';
import { TeamLeagueStat } from '../models/TeamLeagueStat'; // <--- Importamos el nuevo modelo
import { Op } from 'sequelize';
import { Request, Response } from 'express';

export class MatchController {

    static updateTeamStats = async (teamId: number, leagueId: number) => {
        const matches = await Match.findAll({
            where: {
                leagueId: leagueId,
                [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
                played: true 
            }
        });

        // 1. Agregamos penaltyWins a nuestros contadores iniciales
        let points = 0, gamesPlayed = 0, wins = 0, draws = 0, losses = 0;
        let goalsFor = 0, goalsAgainst = 0, penaltyWins = 0; // <--- AQUÍ

        matches.forEach(match => {
            gamesPlayed++;
            const isHome = match.homeTeamId === teamId;
            const myGoals = isHome ? match.homeScore : match.awayScore;
            const rivalGoals = isHome ? match.awayScore : match.homeScore;

            goalsFor += myGoals;
            goalsAgainst += rivalGoals;

            if (myGoals > rivalGoals) {
                wins++; 
                points += 3;
            } else if (myGoals === rivalGoals) {
                draws++; 
                
                if (match.homePenaltiesScore !== null && match.awayPenaltiesScore !== null) {
                    const myPenalties = isHome ? match.homePenaltiesScore : match.awayPenaltiesScore;
                    const rivalPenalties = isHome ? match.awayPenaltiesScore : match.homePenaltiesScore;

                    if (myPenalties > rivalPenalties) {
                        points += 2; 
                        penaltyWins++;
                    } else {
                        points += 1; 
                    }
                } else {
                    points += 1; 
                }
            } else {
                losses++;
            }
        });

        const goalDifference = goalsFor - goalsAgainst;

        // 2. Asegúrate de incluir penaltyWins al guardar/actualizar
        const [stat, created] = await TeamLeagueStat.findOrCreate({
            where: { teamId, leagueId },
            defaults: { points, gamesPlayed, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, penaltyWins }
        });

        if (!created) {
            await stat.update({
                points, gamesPlayed, wins, draws, losses, goalsFor, goalsAgainst, goalDifference, penaltyWins
            });
        }
    }

    // EL CONTROLADOR DEL ENDPOINT
    static updateScore = async (req: Request, res: Response) => {
        try {
            const { matchId } = req.params;
            const { homeScore, awayScore, homePenaltiesScore, awayPenaltiesScore } = req.body;

            const match = await Match.findByPk(matchId);
            if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

            match.homeScore = homeScore;
            match.awayScore = awayScore;

            if (homeScore === awayScore && homePenaltiesScore !== undefined && awayPenaltiesScore !== undefined) {
                match.homePenaltiesScore = homePenaltiesScore;
                match.awayPenaltiesScore = awayPenaltiesScore;
            } else {
                match.homePenaltiesScore = null;
                match.awayPenaltiesScore = null;
            }

            match.played = true; 
            await match.save();

            // Recalcular estadísticas para ambos equipos
            await Promise.all([
                MatchController.updateTeamStats(match.homeTeamId, match.leagueId),
                MatchController.updateTeamStats(match.awayTeamId, match.leagueId)
            ]);

            res.json({ message: 'Marcador actualizado y tabla recalculada con regla de penales' });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error al actualizar el marcador' });
        }
    }
}