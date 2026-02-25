import type { Request, Response } from "express"
import { MatchGenerator } from '../utils/MatchGenerator';
import { Match } from '../models/Match';
import { League } from "../models/League"
import { User } from "../models/User"
import { Team } from "../models/Team"

export class LeagueController {

    static createLeague = async(req:Request, res: Response) => {
        try {
            const league = new League(req.body)
            league.managerId = req.user.id
            await league.save();
            res.send('Liga Creada Correctamente')
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getAllLeagues = async(req:Request, res: Response) => {
        try {
            const leagues = await League.findAll({
                where: {managerId: req.user.id}
            })
            res.json(leagues)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getLeagueById = async (req: Request, res: Response) => {
        try {
            const { leagueId } = req.params;

            const league = await League.findOne({
                where: { 
                    id: leagueId,
                    managerId: req.user!.id
                },
                attributes: ['id'],
                include: [Team]
            });

            if (!league) {
                return res.status(404).json({ error: 'Liga no encontrada o no tienes acceso' });
            }

            res.json(league);
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static updateLeague = async(req:Request, res: Response) => {
        try {
            const {leagueId} = req.params

            const league = await League.findOne({
                where: {id: leagueId, managerId: req.user.id}
            })
            // Validar que la liga exista y que seamos el admin de esa liga
            if(!league) {
                return res.status(404).json({error: 'Liga no encontrada o no tienes permisos'})
            }

            league.name = req.body.name
            league.description = req.body.description

            await league.save()
            res.send(`Liga: ${league.name} actualizada correctamente`)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static deleteLegue = async(req:Request, res: Response) => {
        try {
            const {leagueId} = req.params

            const league = await League.findOne({
                where: {id: leagueId, managerId: req.user.id}
            })
            // Validar que la liga exista y que seamos el admin de esa liga
            if(!league) {
                return res.status(404).json({error: 'Liga no encontrada o no tienes permisos'})
            }

            await league.destroy()

            res.send(`Liga: ${league.name} eliminada correctamente`)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getTrainerTeams = async(req:Request, res: Response) => {
        try {
            const {leagueId} = req.params
            const {email} = req.body

            const league = await League.findOne({
                where: {id: leagueId, managerId: req.user.id}
            })

            // Validar que la liga exista
            if(!league) {
                return res.status(404).json({error: 'Liga no encontrada o no tienes permisos'})
            }

            const trainer = await User.findOne({where: {email}})

            // Validar si el entrenador existe
            if(!trainer) {
                return res.status(404).json({error: 'Entrenador no encontrado'})
            }

            // Traer a todos los equipos del entrenador
            const teams = await Team.findAll({
                where: {trainerId: trainer.id},
                attributes: ['id', 'name']
            })

            res.json(teams)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
            console.log(error)
        }
    }

    static addTeamToLeague = async(req:Request, res: Response) => {
        try {
            const {leagueId} = req.params
            const {teamId} = req.body

            const league = await League.findOne({
                where: {id: leagueId, managerId: req.user.id}
            })
            // Validar que la liga exista
            if(!league) {
                return res.status(404).json({error: 'Liga no encontrada o no tienes permisos'})
            }

            const team = await Team.findByPk(teamId)
            if(!team) {
                return res.status(404).json({error: 'Equipo no encontrado'})
            }

            if (team.leagueId) {
                return res.status(409).json({ error: 'Este equipo ya está registrado en una liga' });
            }

            team.leagueId = league.id;
            await team.save();

            res.send(`El equipo "${team.name}" se agregó correctamente`);

        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getTeamsLeague = async(req:Request, res: Response) => {
        try {
            const {leagueId} = req.params

            const league = await League.findOne({
                where: { 
                    id: leagueId,
                    managerId: req.user!.id
                },
                attributes: [],
                include: [{
                    model: Team,
                    attributes: ['id', 'name'],
                    required: false
                }]
            });

            if (!league) {
                return res.status(404).json({ error: 'Liga no encontrada o no tienes acceso' });
            }

            res.json(league);

        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static removeTeamFromLeague = async(req:Request, res: Response) => {
        try {
            const { leagueId, teamId } = req.params;

            const league = await League.findOne({
                where: { 
                    id: leagueId, 
                    managerId: req.user!.id 
                }
            });

            if (!league) {
                return res.status(404).json({ error: 'Liga no encontrada o no tienes permisos' });
            }

            const team = await Team.findOne({
                where: { 
                    id: teamId, 
                    leagueId: league.id
                }
            });

            if (!team) {
                return res.status(404).json({ error: 'El equipo no existe en esta liga' });
            }

            team.leagueId = null; // Lo sacamos de la liga
            await team.save();

            res.send('Equipo eliminado de la liga correctamente');

        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static generateFixture = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { type } = req.body; 

            const league = await League.findOne({
                where: { id, managerId: req.user!.id },
                include: [Team] // Traemos los equipos inscritos
            });

            if (!league) return res.status(404).json({ error: 'Liga no encontrada' });

            const teams = league.teams;
            if (teams.length < 2) {
                return res.status(400).json({ error: 'Necesitas al menos 2 equipos para crear un fixture' });
            }

            const teamIds = teams.map(t => t.id);
            let generatedMatches = [];

            if (type === 'round-robin') {
                generatedMatches = MatchGenerator.generateRoundRobin(teamIds);
            } else if (type === 'knockout') {
                generatedMatches = MatchGenerator.generateKnockout(teamIds);
            } else {
                return res.status(400).json({ error: 'Tipo de torneo no válido' });
            }

            const matchesToSave = generatedMatches.map(m => ({
                leagueId: league.id,
                homeTeamId: m.home,
                awayTeamId: m.away,
                roundName: m.round,
                played: false
            }));

            await Match.bulkCreate(matchesToSave);

            res.json({ 
                message: 'Pareos generado exitosamente', 
                totalMatches: matchesToSave.length 
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ error: 'Hubo un error al generar el fixture' });
        }
    }

    static getLeagueFixture = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            // Buscamos los partidos de esa liga
            const matches = await Match.findAll({
                where: { leagueId: id },
                include: [
                    { model: Team, as: 'homeTeam', attributes: ['id', 'name', 'logoUrl'] },
                    { model: Team, as: 'awayTeam', attributes: ['id', 'name', 'logoUrl'] }
                ],
                order: [['roundName', 'ASC']] // Ordenados por Jornada
            });

            // Opcional: Agruparlos por jornada para el Frontend
            // Esto devuelve algo como: { "Jornada 1": [partido1, partido2], "Jornada 2": [...] }
            const groupedMatches = matches.reduce((acc: any, match) => {
                const round = match.roundName;
                if (!acc[round]) {
                    acc[round] = [];
                }
                acc[round].push(match);
                return acc;
            }, {});

            res.json(groupedMatches);

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error al obtener el calendario' });
        }
    }

}
