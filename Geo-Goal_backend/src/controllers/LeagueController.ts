import type { Request, Response } from "express";
import { LeagueService } from "../services/LeagueService";
import { Team } from "../models/Team";
import { League } from "../models/League";
import { TeamLeagueStat } from "../models/TeamLeagueStat";
import { Match } from "../models/Match";

/**
 * Handlers de ligas: extraen params/body y user, llaman al servicio, envían respuesta.
 */
export class LeagueController {
  static createLeague = async (req: Request, res: Response): Promise<void> => {
    const result = await LeagueService.createLeague(req.user!.id, req.body);
    res.send(result);
  };

  static getAllLeagues = async (req: Request, res: Response): Promise<void> => {
    const data = await LeagueService.getAllLeagues(req.user!.id);
    res.json(data);
  };

  static getLeagueById = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await LeagueService.getLeagueById(leagueId, req.user!.id);
    res.json(data);
  };

  static updateLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await LeagueService.updateLeague(
      leagueId,
      req.user!.id,
      req.body
    );
    res.send(result);
  };

  static deleteLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const result = await LeagueService.deleteLeague(leagueId, req.user!.id);
    res.send(result);
  };

  static getTrainerTeams = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const { email } = req.body;
    const data = await LeagueService.getTrainerTeams(
      leagueId,
      req.user!.id,
      email
    );
    res.json(data);
  };

  static addTeamToLeague = async (req: Request, res: Response) => {
        try {
            const { teamId } = req.body; 
            const {leagueId} = req.params

            const team = await Team.findByPk(teamId);
            const league = await League.findByPk(leagueId);

            if (!team || !league) {
                return res.status(404).json({ error: 'Equipo o Liga no encontrados' });
            }

            team.leagueId = league.id;
            await team.save();

            await TeamLeagueStat.findOrCreate({
                where: { 
                    teamId: team.id, 
                    leagueId: league.id 
                },
                defaults: {
                    points: 0,
                    gamesPlayed: 0,
                    wins: 0,
                    draws: 0,
                    losses: 0,
                    goalsFor: 0,
                    goalsAgainst: 0,
                    goalDifference: 0
                }
            });

            res.send(`Equipo ${team.name} agregado a la liga`);

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un error al inscribir al equipo' });
        }
    }

  static getTeamsLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId } = req.params;
    const data = await LeagueService.getTeamsLeague(leagueId, req.user!.id);
    res.json(data);
  };

  static removeTeamFromLeague = async (req: Request, res: Response): Promise<void> => {
    const { leagueId, teamId } = req.params;
    const result = await LeagueService.removeTeamFromLeague(
      leagueId,
      teamId,
      req.user!.id
    );
    res.send(result);
  };

  static generateFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { type } = req.body;
    const data = await LeagueService.generateFixture(id, req.user!.id, type);
    res.json(data);
  };

  static getLeagueFixture = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await LeagueService.getLeagueFixture(id);
    res.json(data);
  };

  static getFixtureWithLocations = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const data = await LeagueService.getFixtureWithLocations(id);
    res.json(data);
  };

  static getStandings = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const standings = await TeamLeagueStat.findAll({
          where: { leagueId: id },
          attributes: [
              'points', 
              'gamesPlayed', 
              'wins', 
              'draws', 
              'losses', 
              'goalsFor', 
              'goalsAgainst', 
              'goalDifference',
              'penaltyWins'
          ],
          include: [
              { 
                  model: Team, 
                  attributes: ['id', 'name', 'logoUrl'] 
              }
          ],
          order: [
              ['points', 'DESC'],         
              ['goalDifference', 'DESC'], 
              ['goalsFor', 'DESC']        
          ]
      });

        res.json(standings);

    } catch (error) {
      console.log(error)
        res.status(500).json({ error: 'Hubo un error al obtener la tabla' });
    }
  }

  static getLeagueMatches = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const matches = await Match.findAll({
            where: { leagueId: id },
            include: [
                { 
                    model: Team, 
                    as: 'homeTeam',
                    attributes: ['id', 'name', 'logoUrl'] 
                },
                { 
                    model: Team, 
                    as: 'awayTeam',
                    attributes: ['id', 'name', 'logoUrl'] 
                }
            ],
            order: [['id', 'ASC']] 
        });
        
        const groupedMatches = matches.reduce((acc: any, match) => {
            const round = match.roundName; // Ej: "Jornada 1"
            if (!acc[round]) {
                acc[round] = [];
            }
            acc[round].push(match);
            return acc;
        }, {});

        res.json(groupedMatches);
        return;

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Hubo un error al obtener el calendario' });
        return;
    }
  }

  static restructureFixture = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const league = await League.findByPk(id);
        if (!league) {
            return res.status(404).json({ error: 'Liga no encontrada' });
        }

        const teams = await Team.findAll({ where: { leagueId: id } });
        const teamIds = teams.map(t => t.id);

        if (teamIds.length < 2) {
            return res.status(400).json({ error: 'Se necesitan al menos 2 equipos activos para generar partidos' });
        }

        const playedMatches = await Match.findAll({ 
            where: { leagueId: id, played: true } 
        });

        await Match.destroy({ 
            where: { leagueId: id, played: false } 
        });

        const unplayedPairs: { home: number, away: number }[] = [];
        
        for (let i = 0; i < teamIds.length; i++) {
            for (let j = i + 1; j < teamIds.length; j++) {
                const teamA = teamIds[i];
                const teamB = teamIds[j];

                const alreadyPlayed = playedMatches.some(m => 
                    (m.homeTeamId === teamA && m.awayTeamId === teamB) ||
                    (m.homeTeamId === teamB && m.awayTeamId === teamA)
                );

                if (!alreadyPlayed) {
                    unplayedPairs.push({ home: teamA, away: teamB });
                }
            }
        }

        let maxRoundNumber = 0;
        playedMatches.forEach(m => {
            const matchNumber = m.roundName.match(/\d+/);
            const num = matchNumber ? parseInt(matchNumber[0]) : 0;
            if (num > maxRoundNumber) {
                maxRoundNumber = num;
            }
        });

        let currentRoundNum = maxRoundNumber + 1;
        const newMatchesToSave = [];

        while (unplayedPairs.length > 0) {
            const teamsPlayingThisRound = new Set<number>();
            let i = 0;

            while (i < unplayedPairs.length) {
                const pair = unplayedPairs[i];
                
                if (!teamsPlayingThisRound.has(pair.home) && !teamsPlayingThisRound.has(pair.away)) {
                    
                    newMatchesToSave.push({
                        leagueId: id,
                        homeTeamId: pair.home,
                        awayTeamId: pair.away,
                        roundName: `Jornada ${currentRoundNum}`,
                        played: false
                    });

                    teamsPlayingThisRound.add(pair.home);
                    teamsPlayingThisRound.add(pair.away);

                    unplayedPairs.splice(i, 1);
                } else {
                    i++;
                }
            }
            
             currentRoundNum++;
        }

        if (newMatchesToSave.length > 0) {
            await Match.bulkCreate(newMatchesToSave);
        }

        res.json({ 
            message: 'Calendario reestructurado exitosamente', 
            newMatchesGenerated: newMatchesToSave.length 
        });

    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Hubo un error al reestructurar el calendario' });
    }
  }
}
