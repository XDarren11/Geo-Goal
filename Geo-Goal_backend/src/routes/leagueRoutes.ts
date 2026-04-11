import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { LeagueController } from "../controllers/LeagueController";
import { LeagueInvitationController } from "../controllers/LeagueInvitationController";
import { asyncHandler } from "../middleware/asyncHandler";
import { MatchController } from "../controllers/MatchController";
import { MatchDetailController } from "../controllers/MatchDetailController";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * /api/league:
 *   post:
 *     summary: Crear una nueva liga
 *     tags: [Ligas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Liga Profesional 2024
 *               description:
 *                 type: string
 *                 example: Torneo principal de fútbol profesional
 *     responses:
 *       201:
 *         description: Liga creada exitosamente
 *       401:
 *         description: No autorizado
 *       403:
 *         description: Rol no permitido (solo admin)
 */
router.post('/',
    hasRole('admin'),
    body('name')
        .notEmpty().withMessage('El nombre de la liga es obligatorio'),
    body('description')
        .notEmpty().withMessage('La descripcion debe ser obligatoria'),
    handleInputError,
    asyncHandler(LeagueController.createLeague)
)

/**
 * @swagger
 * /api/league:
 *   get:
 *     summary: Obtener todas las ligas
 *     tags: [Ligas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ligas
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
 *                   description:
 *                     type: string
 *       401:
 *         description: No autorizado
 */
router.get('/',
    hasRole('admin'),
    asyncHandler(LeagueController.getAllLeagues)
)

/**
 * @swagger
 * /api/league/{leagueId}:
 *   get:
 *     summary: Obtener liga por ID
 *     tags: [Ligas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *     responses:
 *       200:
 *         description: Información de la liga
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *       404:
 *         description: Liga no encontrada
 */
router.get('/:leagueId',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID no válido'),
    handleInputError,
    asyncHandler(LeagueController.getLeagueById)
);

/**
 * @swagger
 * /api/league/{leagueId}:
 *   put:
 *     summary: Actualizar una liga
 *     tags: [Ligas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *             properties:
 *               name:
 *                 type: string
 *                 example: Liga Actualizada 2024
 *               description:
 *                 type: string
 *                 example: Descripción actualizada
 *     responses:
 *       200:
 *         description: Liga actualizada exitosamente
 *       404:
 *         description: Liga no encontrada
 */
router.put('/:leagueId',
    hasRole('admin'),
    body('name')
        .notEmpty().withMessage('El nombre de la liga es obligatorio'),
    body('description')
        .notEmpty().withMessage('La descripcion debe ser obligatoria'),
    handleInputError,
    asyncHandler(LeagueController.updateLeague)
)

/**
 * @swagger
 * /api/league/{leagueId}:
 *   delete:
 *     summary: Eliminar una liga
 *     tags: [Ligas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *     responses:
 *       200:
 *         description: Liga eliminada exitosamente
 *       404:
 *         description: Liga no encontrada
 */
router.delete('/:leagueId',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    handleInputError,
    asyncHandler(LeagueController.deleteLeague)
)

// BUSCAR, AGREGAR y ELIMINAR EQUIPOS A LA LIGA

/**
 * @swagger
 * /api/league/{leagueId}/teams/find:
 *   post:
 *     summary: Buscar equipos de un entrenador por email
 *     tags: [Ligas - Gestión de Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
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
 *                 example: coach@example.com
 *     responses:
 *       200:
 *         description: Lista de equipos del entrenador
 *       404:
 *         description: Entrenador no encontrado
 */
router.post('/:leagueId/teams/find',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    body('email').isEmail().withMessage('E-mail no valido'),
    handleInputError,
    asyncHandler(LeagueController.getTrainerTeams)
)

/**
 * @swagger
 * /api/league/{leagueId}/teams:
 *   post:
 *     summary: Agregar un equipo a la liga
 *     tags: [Ligas - Gestión de Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - teamId
 *             properties:
 *               teamId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Equipo agregado exitosamente
 *       404:
 *         description: Liga o equipo no encontrado
 */
router.post('/:leagueId/teams',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    body('teamId').isNumeric().withMessage('El ID del equipo es obligatorio'),
    handleInputError,
    LeagueController.addTeamToLeague
)

/**
 * @swagger
 * /api/league/{leagueId}/teams:
 *   get:
 *     summary: Obtener equipos de una liga
 *     tags: [Ligas - Gestión de Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *     responses:
 *       200:
 *         description: Lista de equipos en la liga
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
 *       404:
 *         description: Liga no encontrada
 */
router.get('/:leagueId/teams',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID no válido'),
    handleInputError,
    asyncHandler(LeagueController.getTeamsLeague)
)

/**
 * @swagger
 * /api/league/{leagueId}/teams/{teamId}:
 *   delete:
 *     summary: Eliminar un equipo de la liga
 *     tags: [Ligas - Gestión de Equipos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la liga
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del equipo
 *     responses:
 *       200:
 *         description: Equipo eliminado de la liga exitosamente
 *       404:
 *         description: Liga o equipo no encontrado
 */
router.delete('/:leagueId/teams/:teamId',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    param('teamId').isNumeric().withMessage('El ID del equipo es obligatorio'),
    handleInputError,
    asyncHandler(LeagueController.removeTeamFromLeague)
)

router.post('/:id/calculate-fixture',
    hasRole('admin'),
    param('id').isInt(),
    body('type').isIn(['round-robin', 'knockout']).withMessage('Tipo inválido'),
        body('scheduleStartDate').optional().isISO8601().withMessage('Fecha inicial inválida'),
        body('matchTime')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .withMessage('Hora inválida (usa HH:mm)'),
        body('daysBetweenRounds').optional().isInt({ min: 0, max: 30 }).withMessage('Intervalo entre jornadas inválido'),
        body('matchDuration')
            .optional()
            .isInt({ min: 10, max: 240 })
            .withMessage('La duración debe ser entre 10 y 240 minutos'),
    handleInputError,
    asyncHandler(LeagueController.generateFixture)
);

router.get('/:id/fixture/locations',
    param('id').isInt(),
    handleInputError,
    asyncHandler(LeagueController.getFixtureWithLocations)
);

router.get('/:id/fixture',
    param('id').isInt(),
    handleInputError,
    asyncHandler(LeagueController.getLeagueFixture)
);

// 1. Actualizar Marcador (Admin)
router.post('/matches/:matchId/result',
    hasRole('admin'),
    param('matchId').isInt(),
    body('homeScore').isInt().withMessage('El marcador debe ser un número'),
    body('awayScore').isInt().withMessage('El marcador debe ser un número'),
    body('homePenaltiesScore').optional().isInt(),
    body('awayPenaltiesScore').optional().isInt(),
    handleInputError,
    MatchController.updateScore
);

router.patch('/matches/:matchId/schedule',
    hasRole('admin'),
    param('matchId').isInt(),
    body('date').isISO8601().withMessage('Fecha y hora inválidas'),
    handleInputError,
    MatchController.scheduleMatch
);

router.put('/matches/:matchId/detail',
    hasRole('admin'),
    param('matchId').isInt().withMessage('ID de partido no válido'),
    body('kickoffTime').optional({ nullable: true }).isISO8601().withMessage('Hora de inicio inválida'),
    body('durationMinutes').optional().isInt({ min: 1 }).withMessage('Duración inválida'),
    body('endTime').optional({ nullable: true }).isISO8601().withMessage('Hora de término inválida'),
    body('matchDay').optional({ nullable: true }).isISO8601().withMessage('Día de partido inválido'),
    body('fieldId').optional({ nullable: true }).isInt().withMessage('Campo inválido'),
    body('homeCoachId').optional({ nullable: true }).isInt().withMessage('Entrenador local inválido'),
    body('awayCoachId').optional({ nullable: true }).isInt().withMessage('Entrenador visitante inválido'),
    body('homeStartingXI').optional().isArray().withMessage('Titulares local inválido'),
    body('awayStartingXI').optional().isArray().withMessage('Titulares visitante inválido'),
    body('homeBench').optional().isArray().withMessage('Banca local inválida'),
    body('awayBench').optional().isArray().withMessage('Banca visitante inválida'),
    body('homeUnavailable').optional().isArray().withMessage('No disponibles local inválido'),
    body('awayUnavailable').optional().isArray().withMessage('No disponibles visitante inválido'),
    body('referee').optional({ nullable: true }).isString().withMessage('Árbitro inválido'),
    body('weather').optional({ nullable: true }).isString().withMessage('Clima inválido'),
    body('attendance').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Asistencia inválida'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notas inválidas'),
    handleInputError,
    asyncHandler(MatchDetailController.upsertByMatchId)
);

router.post('/matches/:matchId/referee/assign',
    hasRole('admin'),
    param('matchId').isInt().withMessage('ID de partido no válido'),
    body('refereeUserId').isInt().withMessage('Árbitro no válido'),
    body('status').optional().isIn(['assigned', 'checked_in', 'closed']).withMessage('Estado inválido'),
    handleInputError,
    asyncHandler(MatchDetailController.assignReferee)
);

router.get('/:leagueId/referees',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID de liga no válido'),
    handleInputError,
    asyncHandler(MatchDetailController.getLeagueReferees)
);

router.get('/:leagueId/matches/upcoming',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID de liga no válido'),
    handleInputError,
    asyncHandler(MatchDetailController.getUpcomingLeagueMatches)
);

router.get('/referee/matches/today',
    hasRole('referee'),
    asyncHandler(MatchDetailController.getTodayRefereeMatches)
);

router.get('/referee/dashboard',
    hasRole('referee'),
    asyncHandler(MatchDetailController.getRefereeDashboard)
);

router.post('/matches/:matchId/referee/events',
    hasRole('referee'),
    param('matchId').isInt().withMessage('ID de partido no válido'),
    body('eventType')
      .isIn(['goal', 'own_goal', 'penalty_scored', 'penalty_missed', 'yellow_card', 'red_card', 'substitution', 'foul', 'offside', 'var_review'])
      .withMessage('Tipo de evento inválido'),
    body('minute').isInt({ min: 0, max: 130 }).withMessage('Minuto inválido'),
    body('extraMinute').optional({ nullable: true }).isInt({ min: 0, max: 30 }).withMessage('Tiempo extra inválido'),
    body('teamId').optional({ nullable: true }).isInt().withMessage('teamId inválido'),
    body('playerId').optional({ nullable: true }).isInt().withMessage('playerId inválido'),
    body('metadata').optional().isObject().withMessage('metadata debe ser objeto'),
    handleInputError,
    asyncHandler(MatchDetailController.registerEvent)
);

router.post('/matches/:matchId/referee/tracking',
    hasRole('referee'),
    param('matchId').isInt().withMessage('ID de partido no válido'),
    body('timestampMs').isInt().withMessage('timestampMs inválido'),
    body('period').optional({ nullable: true }).isIn(['pre', '1H', 'HT', '2H', 'ET', 'post']).withMessage('period inválido'),
    body('ball').optional().isObject().withMessage('ball debe ser objeto'),
    body('players').isArray({ min: 0 }).withMessage('players debe ser arreglo'),
    handleInputError,
    asyncHandler(MatchDetailController.registerTrackingFrame)
);

// 2. Ver Tabla de Posiciones (Público o Autenticado)
router.get('/:id/standings',
    authenticate,
    param('id').isInt(),
    handleInputError,
    LeagueController.getStandings
);

// Ver los resultados de las jornadas
router.get('/:id/matches',
    authenticate,
    param('id').isNumeric().withMessage('ID de la liga no válido'),
    handleInputError,
    LeagueController.getLeagueMatches
);

// Reestructurar calendario a mitad de torneo (cuando entran o salen equipos)
router.post('/:id/restructure-fixture',
    authenticate,
    hasRole('admin'),
    param('id').isInt().withMessage('El ID de la liga no es válido'),
    handleInputError,
    LeagueController.restructureFixture
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   post:
 *     summary: Generar código de invitación para una liga
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresIn:
 *                 type: integer
 *                 description: Minutos hasta que expire el código
 *     responses:
 *       200:
 *         description: Código generado exitosamente
 */
router.post('/:leagueId/invitation',
    authenticate,
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es válido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.generateInvitation)
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   get:
 *     summary: Obtener código de invitación actual
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:leagueId/invitation',
    authenticate,
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es válido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.getInvitation)
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   delete:
 *     summary: Revocar código de invitación
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leagueId
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:leagueId/invitation',
    authenticate,
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es válido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.revokeInvitation)
);

/**
 * @swagger
 * /api/leagues/join-by-code:
 *   post:
 *     summary: Unir equipo a liga usando código
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - teamId
 *             properties:
 *               code:
 *                 type: string
 *                 example: ABC123XY
 *               teamId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Equipo unido a la liga
 */
router.post('/join-by-code',
    authenticate,
    hasRole('coach', 'referee'),
    body('code').notEmpty().withMessage('El código es obligatorio'),
    body('teamId').optional({ nullable: true }).isInt().withMessage('El ID del equipo debe ser un número'),
    handleInputError,
    asyncHandler(LeagueInvitationController.joinByCode)
);

export default router