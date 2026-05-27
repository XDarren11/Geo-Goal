import { Op } from 'sequelize';
import { Notification } from '../models/Notification';
import { Match } from '../models/Match';
import { Team } from '../models/Team';
import { TeamMember } from '../models/TeamMember';
import { TeamFollower } from '../models/TeamFollower';
import { DeviceToken } from '../models/DeviceToken';
import { MatchRefereeAssignment } from '../models/MatchRefereeAssignment';
import { AppError } from '../types/errors';
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from 'expo-server-sdk';

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN || undefined,
});

export interface NotificationPayload {
  type: string;
  title: string;
  message: string;
  payload?: Record<string, unknown>;
}

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

  private static async collectMatchPlayersAndCoaches(match: Match): Promise<number[]> {
    const teams = await Team.findAll({
      where: { id: [match.homeTeamId, match.awayTeamId] },
      attributes: ['id', 'trainerId'],
    });

    const trainerIds = teams.map((t) => t.trainerId).filter(Boolean) as number[];

    const members = await TeamMember.findAll({
      where: { teamId: [match.homeTeamId, match.awayTeamId] },
      attributes: ['userId'],
    });

    const playerIds = members.map((m) => m.userId);

    return [...new Set([...trainerIds, ...playerIds])];
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

  static async notifyMatchParticipantsRefereeAssigned(
    matchId: number,
    refereeName: string
  ): Promise<void> {
    const match = await Match.findByPk(matchId, {
      include: [
        { model: Team, as: 'homeTeam', attributes: ['id', 'name'] },
        { model: Team, as: 'awayTeam', attributes: ['id', 'name'] },
      ],
    });

    if (!match) return;

    const recipientIds = await this.collectMatchPlayersAndCoaches(match);
    const homeName = (match as any).homeTeam?.name ?? 'Local';
    const awayName = (match as any).awayTeam?.name ?? 'Visitante';

    await this.createForUsers(recipientIds, {
      type: 'referee_assigned_to_match',
      title: 'Árbitro designado',
      message: `${refereeName} será el árbitro para ${homeName} vs ${awayName}${match.date ? ` — ${new Date(match.date).toLocaleString()}` : ''}`,
      payload: {
        matchId: match.id,
        leagueId: match.leagueId,
        roundName: match.roundName,
        refereeName,
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
      title: 'Alineacin registrada',
      message: `Tu alineacin para ${homeName} vs ${awayName} fue registrada.`,
      payload: {
        matchId: match.id,
        leagueId: match.leagueId,
        roundName: match.roundName,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Push notifications (Expo Push Service)
  // ---------------------------------------------------------------------------

  /**
   * Envía a un solo usuario: crea Notification in-app + envía push si tiene token.
   */
  static async sendToUser(userId: number, payload: NotificationPayload): Promise<void> {
    await Notification.create({
      userId,
      type: payload.type,
      title: payload.title,
      message: payload.message,
      payload: payload.payload ?? {},
      readAt: null,
    });

    const tokens = await DeviceToken.findAll({
      where: { userId, isActive: true },
      attributes: ['id', 'token'],
    });
    if (tokens.length > 0) {
      await this._sendPushToTokens(tokens.map(t => ({ id: t.id as number, token: t.token })), payload);
    }
  }

  /**
   * Notifica a TODOS los followers de un equipo.
   * Usado para: lineup publicada, resultado final, recordatorio de partido.
   */
  static async broadcastToTeamFollowers(
    teamId: number,
    payload: NotificationPayload
  ): Promise<{ sent: number }> {
    const followers = await TeamFollower.findAll({
      where: { teamId },
      attributes: ['userId'],
    });

    const userIds = followers.map((f) => f.userId);
    if (userIds.length === 0) return { sent: 0 };

    await Notification.bulkCreate(
      userIds.map((uid) => ({
        userId: uid,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        payload: payload.payload ?? {},
        readAt: null,
      })),
      { ignoreDuplicates: true }
    );

    await this._sendBulkPush(userIds, payload);

    console.log(
      `[notif] broadcast '${payload.type}' → ${userIds.length} followers of team ${teamId}`
    );
    return { sent: userIds.length };
  }

  /**
   * Notifica a participantes de un partido (squad players de ambos equipos).
   * Usado para: análisis listo, recordatorio de partido.
   */
  static async notifyMatchParticipants(
    matchId: number,
    payload: NotificationPayload
  ): Promise<{ sent: number }> {
    // Importación lazy para romper ciclo circular con MatchSquadPlayer
    const { MatchSquadPlayer } = await import('../models/MatchSquadPlayer.js');
    const squad = await MatchSquadPlayer.findAll({
      where: { matchId },
      attributes: ['userId'],
    });

    const userIds: number[] = [
      ...new Set(
        squad
          .map((s: any) => s.userId as number)
          .filter((id: unknown): id is number => Number.isInteger(id))
      ),
    ];
    if (userIds.length === 0) return { sent: 0 };

    await Notification.bulkCreate(
      userIds.map((uid: number) => ({
        userId: uid,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        payload: payload.payload ?? {},
        readAt: null,
      }))
    );

    await this._sendBulkPush(userIds, payload);
    return { sent: userIds.length };
  }

  // ---------------------------------------------------------------------------
  // Push helpers (privados)
  // ---------------------------------------------------------------------------

  private static async _sendBulkPush(
    userIds: number[],
    payload: NotificationPayload
  ): Promise<void> {
    const tokens = await DeviceToken.findAll({
      where: { userId: { [Op.in]: userIds }, isActive: true },
      attributes: ['id', 'token'],
    });
    if (tokens.length > 0) {
      await this._sendPushToTokens(tokens.map(t => ({ id: t.id as number, token: t.token })), payload);
    }
  }

  private static async _sendPushToTokens(
    tokens: { id: number; token: string }[],
    payload: NotificationPayload
  ): Promise<void> {
    const messages: ExpoPushMessage[] = tokens
      .filter((t) => Expo.isExpoPushToken(t.token))
      .map((t) => ({
        to: t.token,
        sound: 'default' as const,
        title: payload.title,
        body: payload.message,
        data: payload.payload ?? {},
      }));

    if (messages.length === 0) return;

    try {
      const chunks = expo.chunkPushNotifications(messages);
      const tickets: ExpoPushTicket[] = [];
      for (const chunk of chunks) {
        const result = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...result);
      }
      await this._handleTickets(tickets, tokens);
    } catch (err) {
      console.error('[notif] push send failed:', err);
    }
  }

  private static async _handleTickets(
    tickets: ExpoPushTicket[],
    tokens: { id: number; token: string }[]
  ): Promise<void> {
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (
        ticket.status === 'error' &&
        (ticket as any).details?.error === 'DeviceNotRegistered'
      ) {
        await DeviceToken.update({ isActive: false }, { where: { id: tokens[i].id } });
        console.log(`[notif] token id=${tokens[i].id} marcado inactivo (DeviceNotRegistered)`);
      }
    }
  }
}
