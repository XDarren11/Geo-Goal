import { Op } from 'sequelize';
import { Notification } from '../models/Notification';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { TeamMember } from '../models/TeamMember';
import { MatchRefereeAssignment } from '../models/MatchRefereeAssignment';
import { AppError } from '../types/errors';

export class NotificationService {
  static async createForUsers(
    userIds: number[],
    input: {
      type: string;
      title: string;
      message: string;
      payload?: Record<string, unknown>;
    }
  ): Promise<void> {
    const uniqueUserIds = [...new Set(userIds.filter((id) => Number.isInteger(id)))];
    if (uniqueUserIds.length === 0) return;

    await Notification.bulkCreate(
      uniqueUserIds.map((userId) => ({
        userId,
        type: input.type,
        title: input.title,
        message: input.message,
        payload: input.payload ?? {},
        readAt: null,
      }))
    );
  }

  static async getMyNotifications(userId: number, unreadOnly = false) {
    return Notification.findAll({
      where: {
        userId,
        ...(unreadOnly ? { readAt: { [Op.is]: null } } : {}),
      },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
  }

  static async markAsRead(notificationId: string, userId: number): Promise<string> {
    const notification = await Notification.findOne({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new AppError(404, 'Notificación no encontrada');
    }

    notification.readAt = new Date();
    await notification.save();
    return 'Notificación marcada como leída';
  }

  static async markAllAsRead(userId: number): Promise<string> {
    await Notification.update(
      { readAt: new Date() },
      {
        where: {
          userId,
          readAt: { [Op.is]: null },
        },
      }
    );

    return 'Notificaciones marcadas como leídas';
  }

  private static async collectMatchRecipients(match: Match): Promise<number[]> {
    const teams = await Team.findAll({
      where: { id: [match.homeTeamId, match.awayTeamId] },
      attributes: ['id', 'trainerId'],
    });

    const trainerIds = teams.map((t) => t.trainerId).filter(Boolean);

    const members = await TeamMember.findAll({
      where: { teamId: [match.homeTeamId, match.awayTeamId] },
      attributes: ['userId'],
    });

    const playerIds = members.map((m) => m.userId);

    const refereeAssignments = await MatchRefereeAssignment.findAll({
      where: {
        matchId: match.id,
        status: { [Op.in]: ['assigned', 'checked_in'] },
      },
      attributes: ['refereeUserId'],
    });

    const refereeIds = refereeAssignments.map((r) => r.refereeUserId);

    return [...new Set([...trainerIds, ...playerIds, ...refereeIds])];
  }

  static async notifyMatchScheduled(matchId: number, scheduledDate: Date): Promise<void> {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name'] },
      ],
    });

    if (!match) return;

    const recipientIds = await this.collectMatchRecipients(match);
    const homeName = (match as any).homeTeam?.name ?? 'Local';
    const awayName = (match as any).awayTeam?.name ?? 'Visitante';

    await this.createForUsers(recipientIds, {
      type: 'match_scheduled',
      title: 'Partido programado',
      message: `${homeName} vs ${awayName} fue programado para ${new Date(scheduledDate).toLocaleString()}`,
      payload: {
        matchId: match.id,
        leagueId: match.leagueId,
        roundName: match.roundName,
        scheduledAt: scheduledDate.toISOString(),
      },
    });
  }

  static async notifyRefereeAssigned(matchId: number, refereeUserId: number): Promise<void> {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name'] },
      ],
    });

    if (!match) return;

    const homeName = (match as any).homeTeam?.name ?? 'Local';
    const awayName = (match as any).awayTeam?.name ?? 'Visitante';

    await this.createForUsers([refereeUserId], {
      type: 'referee_assigned',
      title: 'Has sido asignado como árbitro',
      message: `Pitarás ${homeName} vs ${awayName}${match.date ? ` el ${new Date(match.date).toLocaleString()}` : ''}`,
      payload: {
        matchId: match.id,
        leagueId: match.leagueId,
        roundName: match.roundName,
        scheduledAt: match.date ? new Date(match.date).toISOString() : null,
      },
    });
  }

  static async notifyLineupUpdated(matchId: number, teamId: number): Promise<void> {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'trainerId'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'trainerId'] },
      ],
    });

    if (!match) return;

    const homeName = (match as any).homeTeam?.name ?? 'Local';
    const awayName = (match as any).awayTeam?.name ?? 'Visitante';
    const homeTrainer = (match as any).homeTeam?.trainerId ?? null;
    const awayTrainer = (match as any).awayTeam?.trainerId ?? null;

    const targetTrainerId = teamId === match.homeTeamId ? homeTrainer : awayTrainer;
    if (!targetTrainerId) return;

    await this.createForUsers([targetTrainerId], {
      type: 'lineup_update',
      title: 'Alineación registrada',
      message: `Tu alineación para ${homeName} vs ${awayName} fue registrada.`,
      payload: {
        matchId: match.id,
        leagueId: match.leagueId,
        roundName: match.roundName,
      },
    });
  }
}
