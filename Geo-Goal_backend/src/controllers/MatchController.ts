import { Request, Response } from 'express';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { League } from '../models/League';
import { Op } from 'sequelize';

export class MatchController {

    static updateTeamStats = async (teamId: number) => {
        const matches = await Match.findAll({
            where: {
                [Op.or]: [{ homeTeamId: teamId }, { awayTeamId: teamId }],
                played: true // Solo los que ya se jugaron
            }
        });

        let points = 0, gamesPlayed = 0, wins = 0, draws = 0, losses = 0;
        let goalsFor = 0, goalsAgainst = 0;

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
                points += 1;
            } else {
                losses++;
            }
        });

        await Team.update({
            points,
            gamesPlayed,
            wins,
            draws,
            losses,
            goalsFor,
            goalsAgainst,
            goalDifference: goalsFor - goalsAgainst
        }, { where: { id: teamId } });
    }

    static updateScore = async (req: Request, res: Response) => {
        try {
            const { matchId } = req.params;
            const { homeScore, awayScore } = req.body;

            const league = await League.findOne({
                where: {managerId: req.user.id}
            })

            if(!league) {
                res.status(404).json({ error: 'Liga no encontrada o no tines acceso' });
            }

            // 1. Buscar el partido
            const match = await Match.findByPk(matchId);
            if (!match) return res.status(404).json({ error: 'Partido no encontrado' });
            
            // 2. Actualizar el resultado
            match.homeScore = homeScore;
            match.awayScore = awayScore;
            match.played = true;
            await match.save();

            await Promise.all([
                MatchController.updateTeamStats(match.homeTeamId),
                MatchController.updateTeamStats(match.awayTeamId)
            ]);

            res.json({ message: 'Marcador actualizado y tabla recalculada' });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error al actualizar el marcador' });
        }
    }
}