import { fn, col, literal, Op } from "sequelize";
import type { RequestHandler } from "../mediator/RequestHandler";
import { PlayerMatchStat } from "../../models/PlayerMatchStat";
import { User } from "../../models/User";
import { Team } from "../../models/Team";
import { Match } from "../../models/Match";
import { GetMatchPlayersRequest, GetTopScorersRequest, UpdatePlayerMatchGoalsRequest } from "./MatchStatRequests";
import { TeamMember } from "../../models/TeamMember";

export class GetTopScorersHandler implements RequestHandler<GetTopScorersRequest, any[]> {
  async handle(request: GetTopScorersRequest) {
    const scorers = await PlayerMatchStat.findAll({
      attributes: [
        'playerId',
        // Sumamos todos los goles del jugador en esta liga
        [fn('SUM', col('PlayerMatchStat.goals')), 'total_goals'] 
      ],
      include: [
        { model: User, as: 'player', attributes: ['id', 'name'] }, // Ajusta si tienes 'avatar' u otros campos
        { model: Team, as: 'team', attributes: ['id', 'name'] },
        { 
          model: Match, 
          as: 'match', 
          attributes: [], 
          where: { leagueId: request.leagueId } // Filtro estricto por liga
        }
      ],
      // Agrupamos por jugador y equipo
      group: ['playerId', 'player.id', 'team.id'],
      order: [[literal('total_goals'), 'DESC']],
      limit: 10
    });

    // Limpiamos el objeto para enviarlo fácil a React
    return scorers.map(s => ({
      playerId: s.playerId,
      playerName: s.player?.name,
      teamName: s.team?.name,
      totalGoals: Number(s.getDataValue('total_goals') || s.get('total_goals'))
    }));
  }
}

export class UpdatePlayerMatchGoalsHandler implements RequestHandler<UpdatePlayerMatchGoalsRequest, { message: string }> {
  async handle(request: UpdatePlayerMatchGoalsRequest) {
    // Buscamos si ya hay stats de este jugador en este partido
    const [stat, created] = await PlayerMatchStat.findOrCreate({
      where: { 
        matchId: request.matchId, 
        playerId: request.playerId 
      },
      defaults: {
        teamId: request.teamId,
        goals: request.goals,
      }
    });

    // Si ya existía, simplemente actualizamos el número de goles
    if (!created) {
      stat.goals = request.goals;
      await stat.save();
    }

    return { message: "Goles registrados correctamente en el partido" };
  }
}

export class GetMatchPlayersHandler implements RequestHandler<GetMatchPlayersRequest, any[]> {
  async handle(request: GetMatchPlayersRequest) {
    // 1. Buscamos el partido para saber quién contra quién juega
    const match = await Match.findByPk(request.matchId);
    if (!match) return [];

    // 2. Buscamos a los jugadores de AMBOS equipos
    const members = await TeamMember.findAll({
      where: {
        teamId: { [Op.in]: [match.homeTeamId, match.awayTeamId] }
      },
      // 👇 Ya solo pones el modelo, Sequelize detectará el @BelongsTo automáticamente
      include: [{ model: User, attributes: ['id', 'name'] }] 
    });

    return members.map((m: any) => ({
      id: m.user?.id || m.userId, 
      name: m.playerName || m.user?.name || "Sin nombre", // Bonus: Prioriza el playerName si lo registraron
      teamId: m.teamId
    }));
  }
}