import { Response, Request } from "express"
import { Team } from "../models/Team"
import fs from 'fs'; // Para manipular archivos
import path from 'path'; // Para manejar rutas
import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";

export class TeamController {
    static getMyTeams = async (req:Request, res:Response) => {
        try {
            const teams = await Team.findAll({
                where : {trainerId: req.user.id}
            })

            res.json(teams)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getTeamById = async (req:Request, res:Response) => {
        try {
            const {id} = req.params

            const team = await Team.findOne({
                where: {id, trainerId: req.user.id}
            })

            if(!team){
                res.status(404).json({error: 'Equipo no encontrado'})
            }

            res.json(team)
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static createTeam = async (req:Request, res:Response) => {
        try {
            const {name, lat, lng, fieldAddress} = req.body

            let logoPath = null;
            if(req.file) {
                logoPath = req.file.filename
                console.log(logoPath)
            }
            
            const team = new Team({
                name,
                trainerId: req.user.id,
                leagueId: null,
                lat,
                lng,
                fieldAddress,
                logoUrl: logoPath
            })

            await team.save()
            res.send('Equipo creado correctamente')
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static updateTeam = async (req:Request, res:Response) => {
        try {

            const {id} = req.params
            const team = await Team.findOne({
                where: {id: id, trainerId: req.user.id}
            })

            if (!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            team.name = req.body.name || team.name;
            team.lat = req.body.lat || team.lat;
            team.lng = req.body.lng || team.lng;
            team.fieldAddress = req.body.fieldAddress || team.fieldAddress; 

            if(req.file) {
                if(team.logoUrl) {
                    const oldPath = path.resolve('public/uploads', team.logoUrl);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath); // SE BORRA EL ARCHIVO VIEJO!
                    }
                }
                team.logoUrl = req.file.filename
            }

            await team.save()
            res.send('Equipo actualizado correctamente')
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static deleteTeam = async (req:Request, res:Response) => {
        try {

            const {id} = req.params

            const team = await Team.findOne({
                where: {id: id, trainerId: req.user.id}
            })

            if(!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            // ELIMINA LA IMAGEN QUE ESTA AMACENADA
            if(team.logoUrl) {
                const oldPath = path.resolve('public/uploads', team.logoUrl);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath); // SE BORRA EL ARCHIVO VIEJO!
                }
            }

            team.destroy()
            res.send(`El equipo ${team.name} ha sido elimando correctamente`)   
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static findPlayer = async (req:Request, res:Response) => {
        try {
            const {id} = req.params
            const {email} = req.body

            // VALIDAR SI EL EQUIPO PERTENECE A ESE ENTRENADOR
            const team = await Team.findOne({
                where: {id: id, trainerId: req.user.id}
            })

            if(!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            const player = await User.findOne({where: {email}, attributes: ['id', 'name', 'email']})

            if(!player) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json(player)
            
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static addPlayerToTeam = async (req:Request, res:Response) => {
        try {
            const {id} = req.params
            const {playerId} = req.body

            // VALIDAR SI EL EQUIPO PERTENECE A ESE ENTRENADOR
            const team = await Team.findOne({
                where: {id: id, trainerId: req.user.id}
            })

            if(!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            const player = await User.findByPk(playerId)

            if(!player) {
                return res.status(404).json({error: 'Jugador no encontrado'})
            }

            const exists = await TeamMember.findOne({
                where: {
                    teamId: team.id,
                    userId: player.id
                }
            })

            if (exists) {
                return res.status(409).json({ error: 'El jugador ya forma parte de este equipo' });
            }

            await team.$add('player', player)

            res.send('Jugador agregado al equipo correctamente');
            
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static getPlayersTeam = async (req:Request, res:Response) => {
        try {
            const { id } = req.params;

            const team = await Team.findOne({
                where: { 
                    id: id, 
                    trainerId: req.user!.id 
                },
                include: [
                    {
                        model: User,
                        as: 'players',
                        attributes: ['id', 'name', 'email'],
                        through: { attributes: [] }
                    }
                ]
            });

            if (!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            res.json(team.players);
            
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }

    static deletePlayerToTeam = async (req:Request, res:Response) => {
        try {
            const {id, playerId} = req.params

            //Validamos si el entrenador es dueño del equipo
            const team = await Team.findOne({
                where: {id: id, trainerId: req.user.id}
            })

            if(!team) {
                return res.status(404).json({ error: 'Equipo no encontrado o no eres el DT' });
            }

            const teamMember = await TeamMember.findOne({
                where: {
                    teamId: id,
                    userId: playerId
                }
            })

            if (!teamMember) {
                return res.status(404).json({ error: 'El jugador no pertenece a este equipo' });
            }

            await teamMember.destroy();

            res.send('Jugador eliminado del equipo correctamente');
            
        } catch (error) {
            res.status(500).json({error: 'Hubo un error'})
        }
    }
}