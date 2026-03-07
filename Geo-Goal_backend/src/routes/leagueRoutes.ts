import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { LeagueController } from "../controllers/LeagueController";
import { asyncHandler } from "../middleware/asyncHandler";

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
    asyncHandler(LeagueController.addTeamToLeague)
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
    handleInputError,
    asyncHandler(LeagueController.generateFixture)
);

router.get('/:id/fixture',
    param('id').isInt(),
    handleInputError,
    asyncHandler(LeagueController.getLeagueFixture)
);

export default router