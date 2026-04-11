import { Match } from '../models/Match';
import { TeamLeagueStat } from '../models/TeamLeagueStat'; // <--- Importamos el nuevo modelo
import { MatchDetail } from '../models/MatchDetail';
import { Op } from 'sequelize';
import { Request, Response } from 'express';
import { AuditService } from '../services/AuditService';
import { NotificationService } from '../services/NotificationService';
import { MatchAnalyticsService } from '../services/MatchAnalyticsService';

export class MatchController {

    static scheduleMatch = async (req: Request, res: Response) => {
        try {
            const { matchId } = req.params;
            const { date } = req.body;

            const match = await Match.findByPk(matchId);
            if (!match) return res.status(404).json({ error: 'Partido no encontrado' });

            if (match.date && new Date(match.date).getTime() < Date.now()) {
                return res.status(409).json({
                    error: 'No se puede cambiar la fecha de un partido cuya fecha/hora ya pasó',
                });
            }

            const parsedDate = new Date(date);
            if (Number.isNaN(parsedDate.getTime())) {
                return res.status(400).json({ error: 'Fecha y hora inválidas' });
            }

            const beforeData = match.toJSON() as Record<string, unknown>;

            match.date = parsedDate;
            await match.save();

            const [detail] = await MatchDetail.findOrCreate({
                where: { matchId: match.id },
                defaults: {
                    matchId: match.id,
                    kickoffTime: parsedDate,
                    durationMinutes: 90,
                    endTime: new Date(parsedDate.getTime() + 90 * 60 * 1000),
                    matchDay: parsedDate.toISOString().slice(0, 10),
                    homeStartingXI: [],
                    awayStartingXI: [],
                    homeBench: [],
                    awayBench: [],
                    createdBy: req.user?.id ?? null,
                    updatedBy: req.user?.id ?? null,
                },
            });

            if (detail) {
                detail.kickoffTime = parsedDate;
                detail.matchDay = parsedDate.toISOString().slice(0, 10);
                const duration = detail.durationMinutes ?? 90;
                detail.endTime = new Date(parsedDate.getTime() + duration * 60 * 1000);
                detail.updatedBy = req.user?.id ?? null;
                await detail.save();
            }

            await NotificationService.notifyMatchScheduled(match.id, parsedDate);

            await AuditService.log({
                actorUserId: req.user?.id ?? null,
                leagueId: match.leagueId,
                seasonId: match.seasonId ?? null,
                entityType: 'match_schedule',
                entityId: match.id,
                action: 'update',
                beforeData,
                afterData: match.toJSON() as Record<string, unknown>,
                reason: req.body?.reason ?? 'Programación individual de partido',
                ip: req.ip,
                userAgent: req.get('user-agent') ?? null,
            });

            res.json({ message: 'Partido programado correctamente', match });
        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error al programar el partido' });
        }
    }

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

            const beforeData = match.toJSON() as Record<string, unknown>;

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

            await AuditService.log({
                actorUserId: req.user?.id ?? null,
                leagueId: match.leagueId,
                seasonId: match.seasonId ?? null,
                entityType: 'match',
                entityId: match.id,
                action: 'manual_fix',
                beforeData,
                afterData: match.toJSON() as Record<string, unknown>,
                reason: req.body?.reason ?? 'Actualización de marcador',
                ip: req.ip,
                userAgent: req.get('user-agent') ?? null,
            });

            // Recalcular estadísticas para ambos equipos
            await Promise.all([
                MatchController.updateTeamStats(match.homeTeamId, match.leagueId),
                MatchController.updateTeamStats(match.awayTeamId, match.leagueId)
            ]);

            await MatchAnalyticsService.recalculateForMatch(match.id);

            res.json({ message: 'Marcador actualizado y tabla recalculada con regla de penales' });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Error al actualizar el marcador' });
        }
    }
}