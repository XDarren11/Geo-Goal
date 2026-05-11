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
import { uploadLeagueLogo } from "../middleware/upload";

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
 *                 example: Torneo principal de f?tbol profesional
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
    uploadLeagueLogo.single('logo'),
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
 *         description: Informaci?n de la liga
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

// Subir/actualizar logo de liga
router.patch('/:leagueId/logo',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID no válido'),
    handleInputError,
    uploadLeagueLogo.single('logo'),
    asyncHandler(LeagueController.updateLeagueLogo)
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
 *                 example: Descripci?n actualizada
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
 *     tags: [Ligas - Gesti?n de Equipos]
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
 *     tags: [Ligas - Gesti?n de Equipos]
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
    asyncHandler(LeagueController.addTeamToLeague)
)

/**
 * @swagger
 * /api/league/{leagueId}/teams:
 *   get:
 *     summary: Obtener equipos de una liga
 *     tags: [Ligas - Gesti?n de Equipos]
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
    param('leagueId').isInt().withMessage('ID no v?lido'),
    handleInputError,
    asyncHandler(LeagueController.getTeamsLeague)
)

/**
 * @swagger
 * /api/league/{leagueId}/teams/{teamId}:
 *   delete:
 *     summary: Eliminar un equipo de la liga
 *     tags: [Ligas - Gesti?n de Equipos]
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
    body('type').isIn(['round-robin', 'knockout']).withMessage('Tipo inv?lido'),
        body('scheduleStartDate').optional().isISO8601().withMessage('Fecha inicial inv?lida'),
        body('matchTime')
            .optional()
            .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
            .withMessage('Hora inv?lida (usa HH:mm)'),
        body('daysBetweenRounds').optional().isInt({ min: 0, max: 30 }).withMessage('Intervalo entre jornadas inv?lido'),
        body('matchDuration')
            .optional()
            .isInt({ min: 10, max: 240 })
            .withMessage('La duraci?n debe ser entre 10 y 240 minutos'),
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
    body('homeScore').isInt().withMessage('El marcador debe ser un n?mero'),
    body('awayScore').isInt().withMessage('El marcador debe ser un n?mero'),
    body('homePenaltiesScore').optional().isInt(),
    body('awayPenaltiesScore').optional().isInt(),
    handleInputError,
    MatchController.updateScore
);

router.patch('/matches/:matchId/schedule',
    hasRole('admin'),
    param('matchId').isInt(),
    body('date').isISO8601().withMessage('Fecha y hora inv?lidas'),
    handleInputError,
    MatchController.scheduleMatch
);

router.put('/matches/:matchId/detail',
    hasRole('admin'),
    param('matchId').isInt().withMessage('ID de partido no v?lido'),
    body('kickoffTime').optional({ nullable: true }).isISO8601().withMessage('Hora de inicio inv?lida'),
    body('durationMinutes').optional().isInt({ min: 1 }).withMessage('Duraci?n inv?lida'),
    body('endTime').optional({ nullable: true }).isISO8601().withMessage('Hora de t?rmino inv?lida'),
    body('matchDay').optional({ nullable: true }).isISO8601().withMessage('D?a de partido inv?lido'),
    body('fieldId').optional({ nullable: true }).isInt().withMessage('Campo inv?lido'),
    body('homeCoachId').optional({ nullable: true }).isInt().withMessage('Entrenador local inv?lido'),
    body('awayCoachId').optional({ nullable: true }).isInt().withMessage('Entrenador visitante inv?lido'),
    body('homeStartingXI').optional().isArray().withMessage('Titulares local inv?lido'),
    body('awayStartingXI').optional().isArray().withMessage('Titulares visitante inv?lido'),
    body('homeBench').optional().isArray().withMessage('Banca local inv?lida'),
    body('awayBench').optional().isArray().withMessage('Banca visitante inv?lida'),
    body('homeUnavailable').optional().isArray().withMessage('No disponibles local inv?lido'),
    body('awayUnavailable').optional().isArray().withMessage('No disponibles visitante inv?lido'),
    body('referee').optional({ nullable: true }).isString().withMessage('��rbitro inv?lido'),
    body('weather').optional({ nullable: true }).isString().withMessage('Clima inv?lido'),
    body('attendance').optional({ nullable: true }).isInt({ min: 0 }).withMessage('Asistencia inv?lida'),
    body('notes').optional({ nullable: true }).isString().withMessage('Notas inv?lidas'),
    handleInputError,
    asyncHandler(MatchDetailController.upsertByMatchId)
);

router.post('/matches/:matchId/referee/assign',
    hasRole('admin'),
    param('matchId').isInt().withMessage('ID de partido no v?lido'),
    body('refereeUserId').isInt().withMessage('��rbitro no v?lido'),
    body('status').optional().isIn(['assigned', 'checked_in', 'closed']).withMessage('Estado inv?lido'),
    handleInputError,
    asyncHandler(MatchDetailController.assignReferee)
);

router.get('/:leagueId/referees',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID de liga no v?lido'),
    handleInputError,
    asyncHandler(MatchDetailController.getLeagueReferees)
);

router.get('/:leagueId/matches/upcoming',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID de liga no v?lido'),
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
    hasRole('referee', 'admin'),
    param('matchId').isInt().withMessage('ID de partido no v?lido'),
    body('eventType')
            .isIn(['goal', 'own_goal', 'penalty_scored', 'penalty_missed', 'pass', 'key_pass', 'shot', 'tackle', 'recovery', 'interception', 'clearance', 'dribble', 'cross', 'corner_won', 'yellow_card', 'red_card', 'substitution', 'foul', 'offside', 'var_review'])
      .withMessage('Tipo de evento inv?lido'),
    body('minute').isInt({ min: 0, max: 130 }).withMessage('Minuto inv?lido'),
    body('extraMinute').optional({ nullable: true }).isInt({ min: 0, max: 30 }).withMessage('Tiempo extra inv?lido'),
        body('matchTimestampSec').optional({ nullable: true }).isInt({ min: 0, max: 9000 }).withMessage('matchTimestampSec inv?lido'),
    body('teamId').optional({ nullable: true }).isInt().withMessage('teamId inv?lido'),
    body('playerId').optional({ nullable: true }).isInt().withMessage('playerId inv?lido'),
        body('relatedPlayerId').optional({ nullable: true }).isInt().withMessage('relatedPlayerId inv?lido'),
        body('xStart').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('xStart inv?lido'),
        body('yStart').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('yStart inv?lido'),
        body('xEnd').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('xEnd inv?lido'),
        body('yEnd').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('yEnd inv?lido'),
        body('outcome').optional({ nullable: true }).isString().withMessage('outcome inv?lido'),
        body('source').optional().isIn(['manual', 'inferred', 'video', 'simulated']).withMessage('source inv?lido'),
        body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('confidence inv?lido'),
    body('metadata').optional().isObject().withMessage('metadata debe ser objeto'),
    handleInputError,
    asyncHandler(MatchDetailController.registerEvent)
);

router.post('/matches/:matchId/referee/events/bulk',
    hasRole('referee', 'admin'),
        param('matchId').isInt().withMessage('ID de partido no v?lido'),
        body('events').isArray({ min: 1 }).withMessage('events debe ser arreglo con elementos'),
        body('events.*.eventType')
            .isIn(['goal', 'own_goal', 'penalty_scored', 'penalty_missed', 'pass', 'key_pass', 'shot', 'tackle', 'recovery', 'interception', 'clearance', 'dribble', 'cross', 'corner_won', 'yellow_card', 'red_card', 'substitution', 'foul', 'offside', 'var_review'])
            .withMessage('Tipo de evento inv?lido en events'),
        body('events.*.minute').isInt({ min: 0, max: 130 }).withMessage('Minuto inv?lido en events'),
        body('events.*.extraMinute').optional({ nullable: true }).isInt({ min: 0, max: 30 }).withMessage('Tiempo extra inv?lido en events'),
        body('events.*.matchTimestampSec').optional({ nullable: true }).isInt({ min: 0, max: 9000 }).withMessage('matchTimestampSec inv?lido en events'),
        body('events.*.teamId').optional({ nullable: true }).isInt().withMessage('teamId inv?lido en events'),
        body('events.*.playerId').optional({ nullable: true }).isInt().withMessage('playerId inv?lido en events'),
        body('events.*.relatedPlayerId').optional({ nullable: true }).isInt().withMessage('relatedPlayerId inv?lido en events'),
        body('events.*.xStart').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('xStart inv?lido en events'),
        body('events.*.yStart').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('yStart inv?lido en events'),
        body('events.*.xEnd').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('xEnd inv?lido en events'),
        body('events.*.yEnd').optional({ nullable: true }).isFloat({ min: 0, max: 100 }).withMessage('yEnd inv?lido en events'),
        body('events.*.outcome').optional({ nullable: true }).isString().withMessage('outcome inv?lido en events'),
        body('events.*.source').optional().isIn(['manual', 'inferred', 'video', 'simulated']).withMessage('source inv?lido en events'),
        body('events.*.confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('confidence inv?lido en events'),
        body('events.*.metadata').optional().isObject().withMessage('metadata debe ser objeto en events'),
        handleInputError,
        asyncHandler(MatchDetailController.registerBulkEvents)
);

router.post('/matches/:matchId/referee/tracking',
    hasRole('referee', 'admin'),
    param('matchId').isInt().withMessage('ID de partido no v?lido'),
    body('timestampMs').isInt().withMessage('timestampMs inv?lido'),
    body('period').optional({ nullable: true }).isIn(['pre', '1H', 'HT', '2H', 'ET', 'post']).withMessage('period inv?lido'),
    body('ball').optional().isObject().withMessage('ball debe ser objeto'),
    body('players').isArray({ min: 0 }).withMessage('players debe ser arreglo'),
    body('source').optional().isIn(['manual', 'inferred', 'video', 'simulated']).withMessage('source inv?lido'),
    body('confidence').optional().isFloat({ min: 0, max: 1 }).withMessage('confidence inv?lido'),
    handleInputError,
    asyncHandler(MatchDetailController.registerTrackingFrame)
);

router.get('/matches/:matchId/analytics',
    hasRole('admin', 'coach', 'player', 'referee'),
    param('matchId').isInt().withMessage('ID de partido no v?lido'),
    handleInputError,
    asyncHandler(MatchDetailController.getMatchAnalytics)
);

// 2. Ver Tabla de Posiciones (P?blico o Autenticado)
router.get('/:id/standings',
    param('id').isInt(),
    handleInputError,
    asyncHandler(LeagueController.getStandings)
);

// Ver los resultados de las jornadas
router.get('/:id/matches',
    param('id').isNumeric().withMessage('ID de la liga no v?lido'),
    handleInputError,
    asyncHandler(LeagueController.getLeagueMatches)
);

// Reestructurar calendario a mitad de torneo (cuando entran o salen equipos)
router.post('/:id/restructure-fixture',
    hasRole('admin'),
    param('id').isInt().withMessage('El ID de la liga no es v?lido'),
    handleInputError,
    asyncHandler(LeagueController.restructureFixture)
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   post:
 *     summary: Generar c?digo de invitaci?n para una liga
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
 *                 description: Minutos hasta que expire el c?digo
 *     responses:
 *       200:
 *         description: C?digo generado exitosamente
 */
router.post('/:leagueId/invitation',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es v?lido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.generateInvitation)
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   get:
 *     summary: Obtener c?digo de invitaci?n actual
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
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es v?lido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.getInvitation)
);

/**
 * @swagger
 * /api/leagues/:leagueId/invitation:
 *   delete:
 *     summary: Revocar c?digo de invitaci?n
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
    hasRole('admin'),
    param('leagueId').isInt().withMessage('El ID de la liga no es v?lido'),
    handleInputError,
    asyncHandler(LeagueInvitationController.revokeInvitation)
);

/**
 * @swagger
 * /api/leagues/join-by-code:
 *   post:
 *     summary: Unir equipo a liga usando c?digo
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
    hasRole('coach', 'referee'),
    body('code').notEmpty().withMessage('El c?digo es obligatorio'),
    body('teamId').optional({ nullable: true }).isInt().withMessage('El ID del equipo debe ser un n?mero'),
    handleInputError,
    asyncHandler(LeagueInvitationController.joinByCode)
);

export default router