import { Router } from "express";
import { authnticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { TeamController } from "../controllers/TeamController";
import { upload } from "../middleware/upload";

const router = Router()

router.use(authnticate)

// Router para  equipos

// CREAR, EDITAR Y ELIMINAR EQUIPOS

/**
 * @swagger
 * /api/teams:
 *   get:
 *     summary: Obtener mis equipos (coach)
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de equipos del coach
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   logo:
 *                     type: string
 *                   fieldAddress:
 *                     type: string
 *                   lat:
 *                     type: number
 *                   lng:
 *                     type: number
 *       401:
 *         description: No autorizado
 */
router.get('/',
    hasRole('coach'),
    TeamController.getMyTeams
)

/**
 * @swagger
 * /api/teams/{id}:
 *   get:
 *     summary: Obtener un equipo por ID
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Información del equipo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 logo:
 *                   type: string
 *                 fieldAddress:
 *                   type: string
 *                 lat:
 *                   type: number
 *                 lng:
 *                   type: number
 *       404:
 *         description: Equipo no encontrado
 */
router.get('/:id',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no valido'),
    handleInputError,
    TeamController.getTeamById
)

/**
 * @swagger
 * /api/teams:
 *   post:
 *     summary: Crear un nuevo equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - lat
 *               - lng
 *               - fieldAddress
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tigres FC
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo del equipo (imagen)
 *               lat:
 *                 type: number
 *                 example: 19.4326
 *               lng:
 *                 type: number
 *                 example: -99.1332
 *               fieldAddress:
 *                 type: string
 *                 example: Estadio Azteca, CDMX
 *     responses:
 *       201:
 *         description: Equipo creado exitosamente
 *       401:
 *         description: No autorizado
 */
router.post('/',
    hasRole('coach'),
    upload.single('logo'),
    body('name')
        .notEmpty().withMessage('El nombre es obligatorio'),
    body('lat').
        notEmpty().withMessage('Falta la latitud'),
    body('lng')
        .notEmpty().withMessage('Falta la longitud'),
    body('fieldAddress')
        .notEmpty().withMessage('La dirección es obligatoria'),
    handleInputError,
    TeamController.createTeam
)

/**
 * @swagger
 * /api/teams/{id}:
 *   put:
 *     summary: Actualizar un equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Tigres FC Actualizado
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo del equipo (imagen)
 *               lat:
 *                 type: number
 *                 example: 19.4326
 *               lng:
 *                 type: number
 *                 example: -99.1332
 *               fieldAddress:
 *                 type: string
 *                 example: Estadio Universitario, CDMX
 *     responses:
 *       200:
 *         description: Equipo actualizado exitosamente
 *       404:
 *         description: Equipo no encontrado
 */
router.put('/:id',
    hasRole('coach'),
    upload.single('logo'),
    param('id').isInt().withMessage('ID no valido'),
    handleInputError,
    TeamController.updateTeam
)

/**
 * @swagger
 * /api/teams/{id}:
 *   delete:
 *     summary: Eliminar un equipo
 *     tags: [Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Equipo eliminado exitosamente
 *       404:
 *         description: Equipo no encontrado
 */
router.delete('/:id',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no valido'),
    TeamController.deleteTeam
)

//AGREGAR RUTAS PARA BUSCAR AL JUGADOR, AGREGARLO AL EQUIPO Y ELIMINARLO DEL EQUIPO 

/**
 * @swagger
 * /api/teams/{id}/player/find:
 *   post:
 *     summary: Buscar un jugador por email
 *     tags: [Equipos - Gestión de Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: jugador@example.com
 *     responses:
 *       200:
 *         description: Jugador encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *       404:
 *         description: Jugador no encontrado
 */
router.post('/:id/player/find',
    hasRole('coach'),
    param('id').isNumeric().withMessage('ID del equipo no valido'),
    body('email').isEmail().withMessage('E-mail no valido'),
    handleInputError,
    TeamController.findPlayer
)

/**
 * @swagger
 * /api/teams/{id}/player:
 *   post:
 *     summary: Agregar un jugador al equipo
 *     tags: [Equipos - Gestión de Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - playerId
 *             properties:
 *               playerId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Jugador agregado exitosamente
 *       404:
 *         description: Equipo o jugador no encontrado
 */
router.post('/:id/player',
    hasRole('coach'),
    param('id').isNumeric().withMessage('ID de la liga no valido'),
    body('playerId').isNumeric().withMessage('El ID del jugador es obligatorio'),
    handleInputError,
    TeamController.addPlayerToTeam
)

/**
 * @swagger
 * /api/teams/{id}/player:
 *   get:
 *     summary: Obtener jugadores de un equipo
 *     tags: [Equipos - Gestión de Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Lista de jugadores del equipo
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *       404:
 *         description: Equipo no encontrado
 */
router.get('/:id/player',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no válido'),
    handleInputError,
    TeamController.getPlayersTeam
)

/**
 * @swagger
 * /api/teams/{id}/player/{playerId}:
 *   delete:
 *     summary: Eliminar un jugador del equipo
 *     tags: [Equipos - Gestión de Jugadores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del jugador
 *     responses:
 *       200:
 *         description: Jugador eliminado del equipo exitosamente
 *       404:
 *         description: Equipo o jugador no encontrado
 */
router.delete('/:id/player/:playerId',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no válido'),
    param('playerId').isInt().withMessage('ID no valido'),
    handleInputError,
    TeamController.deletePlayerToTeam
)

export default router