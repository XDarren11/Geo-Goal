import { Response, Request } from "express"
import { Team } from "../models/Team"
import fs from 'fs'; // Para manipular archivos
import path from 'path'; // Para manejar rutas
import { User } from "../models/User";
import { TeamMember } from "../models/TeamMember";

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Crea un nuevo equipo
 *     tags:
 *       - Team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               fieldAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo creado correctamente
 *       500:
 *         description: Error interno
 */

export class TeamController {
    /**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Obtiene todos los equipos del entrenador
 *     tags:
 *       - Team
 *     responses:
 *       200:
 *         description: Lista de equipos
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Obtiene un equipo por ID
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Equipo encontrado
 *       404:
 *         description: Equipo no encontrado
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Crea un nuevo equipo
 *     tags:
 *       - Team
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               fieldAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo creado correctamente
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}:
 *   put:
 *     summary: Actualiza un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               lat:
 *                 type: number
 *               lng:
 *                 type: number
 *               fieldAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Equipo actualizado correctamente
 *       404:
 *         description: Equipo no encontrado o no eres el DT
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}:
 *   delete:
 *     summary: Elimina un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Equipo eliminado correctamente
 *       404:
 *         description: Equipo no encontrado o no eres el DT
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}/find-player:
 *   post:
 *     summary: Busca un jugador por email en un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Jugador encontrado
 *       404:
 *         description: Equipo o jugador no encontrado
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}/add-player:
 *   post:
 *     summary: Agrega un jugador a un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Jugador agregado correctamente
 *       404:
 *         description: Equipo o jugador no encontrado
 *       409:
 *         description: Jugador ya forma parte de este equipo
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}/players:
 *   get:
 *     summary: Obtiene los jugadores de un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de jugadores
 *       404:
 *         description: Equipo no encontrado o no eres el DT
 *       500:
 *         description: Error interno
 */
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

    /**
 * @swagger
 * /api/teams/{id}/remove-player/{playerId}:
 *   delete:
 *     summary: Elimina un jugador de un equipo
 *     tags:
 *       - Team
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Jugador eliminado del equipo correctamente
 *       404:
 *         description: Equipo o jugador no encontrado
 *       500:
 *         description: Error interno
 */
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