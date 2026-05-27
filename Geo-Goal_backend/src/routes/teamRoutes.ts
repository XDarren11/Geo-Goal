import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { TeamController } from "../controllers/TeamController";
import { TeamInvitationController } from "../controllers/TeamInvitationController";
import { TeamFollowerController } from "../controllers/TeamFollowerController";
import { MatchDetailController } from "../controllers/MatchDetailController";
import { upload, uploadAvatar } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authenticate);

router.get("/coach/dashboard", hasRole("coach"), asyncHandler(TeamController.getCoachDashboard));
router.get("/player/dashboard", hasRole("player"), asyncHandler(TeamController.getPlayerDashboard));

router.get("/", hasRole("coach"), asyncHandler(TeamController.getMyTeams));

router.get("/player/me", hasRole("player"), asyncHandler(TeamController.getPlayerTeams));

router.get(
  "/:id",
  hasRole("admin", "coach", "player"),
  param("id").isInt().withMessage("ID no válido"),
  handleInputError,
  asyncHandler(TeamController.getTeamById)
);

router.post(
  "/",
  hasRole("coach"),
  upload.single("logo"),
  body("name").notEmpty().withMessage("El nombre es obligatorio"),
  body("lat").notEmpty().withMessage("Falta la latitud"),
  body("lng").notEmpty().withMessage("Falta la longitud"),
  body("fieldAddress").notEmpty().withMessage("La dirección es obligatoria"),
  handleInputError,
  asyncHandler(TeamController.createTeam)
);

router.put(
  "/:id",
  hasRole("coach"),
  upload.single("logo"),
  param("id").isInt().withMessage("ID no válido"),
  handleInputError,
  asyncHandler(TeamController.updateTeam)
);

router.delete(
  "/:id",
  hasRole("coach"),
  param("id").isInt().withMessage("ID no válido"),
  asyncHandler(TeamController.deleteTeam)
);

router.post(
  "/:id/player/find",
  hasRole("coach"),
  param("id").isNumeric().withMessage("ID del equipo no válido"),
  body("email").isString().trim().notEmpty().withMessage("Debes escribir un correo o username"),
  handleInputError,
  asyncHandler(TeamController.findPlayer)
);

router.post(
  "/:id/player",
  hasRole("coach"),
  param("id").isNumeric().withMessage("ID del equipo no válido"),
  body("playerId").isNumeric().withMessage("El ID del jugador es obligatorio"),
  handleInputError,
  asyncHandler(TeamController.addPlayerToTeam)
);

router.get(
  "/:id/player",
  hasRole("admin", "coach", "player"),
  param("id").isInt().withMessage("ID no válido"),
  handleInputError,
  asyncHandler(TeamController.getPlayersTeam)
);

router.delete(
  "/:id/player/:playerId",
  hasRole("coach"),
  param("id").isInt().withMessage("ID no válido"),
  param("playerId").isInt().withMessage("ID no válido"),
  handleInputError,
  asyncHandler(TeamController.deletePlayerToTeam)
);

// Subir/actualizar avatar de jugador en equipo (solo el propio jugador)
router.patch(
  "/:id/member/avatar",
  hasRole("player"),
  param("id").isInt().withMessage("ID no válido"),
  handleInputError,
  uploadAvatar.single("avatar"),
  asyncHandler(TeamController.updatePlayerAvatar)
);

router.patch(
  "/:id/member/profile",
  hasRole("player"),
  param("id").isInt().withMessage("ID no válido"),
  body("playerName").optional().isString().trim().notEmpty().withMessage("El nombre de jugador es obligatorio"),
  body("jerseyNumber").optional().isInt({ min: 1, max: 99 }).withMessage("El dorsal debe ser un número entre 1 y 99"),
  handleInputError,
  uploadAvatar.single("avatar"),
  asyncHandler(TeamController.updatePlayerProfile)
);

router.get('/leagues/coach/active',
    hasRole("coach"),
    handleInputError,
    TeamController.getCoachActiveLeagues
);

router.get('/leagues/:leagueId/teams/:teamId/dashboard',
    param('leagueId').isInt(),
    param('teamId').isInt(),
    handleInputError,
    TeamController.getTeamDashboard
);

router.put(
  "/matches/:matchId/lineup",
  hasRole("coach"),
  param("matchId").isInt().withMessage("ID de partido no válido"),
  body("startingXI").isArray().withMessage("Titulares debe ser un arreglo"),
  body("bench").optional().isArray().withMessage("Banca inválida"),
  body("unavailable").optional().isArray().withMessage("No disponibles inválido"),
  body("formation").optional().isString().trim().isLength({ min: 3, max: 10 }).withMessage("Formación inválida"),
  handleInputError,
  asyncHandler(MatchDetailController.upsertCoachLineup)
);

/**
 * @swagger
 * /api/teams/:teamId/invitation:
 *   post:
 *     summary: Generar código de invitación para un equipo
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
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
router.post('/:teamId/invitation',
  hasRole('coach'),
    param('teamId').isInt().withMessage('El ID del equipo no es válido'),
    handleInputError,
    asyncHandler(TeamInvitationController.generateInvitation)
);

/**
 * @swagger
 * /api/teams/:teamId/invitation:
 *   get:
 *     summary: Obtener código de invitación actual
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:teamId/invitation',
  hasRole('coach'),
    param('teamId').isInt().withMessage('El ID del equipo no es válido'),
    handleInputError,
    asyncHandler(TeamInvitationController.getInvitation)
);

/**
 * @swagger
 * /api/teams/:teamId/invitation:
 *   delete:
 *     summary: Revocar código de invitación
 *     tags: [Invitaciones]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: teamId
 *         required: true
 *         schema:
 *           type: integer
 */
router.delete('/:teamId/invitation',
  hasRole('coach'),
    param('teamId').isInt().withMessage('El ID del equipo no es válido'),
    handleInputError,
    asyncHandler(TeamInvitationController.revokeInvitation)
);

/**
 * @swagger
 * /api/teams/join-by-code:
 *   post:
 *     summary: Unir jugador a equipo usando código
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
 *             properties:
 *               code:
 *                 type: string
 *                 example: ABC123XY
 *     responses:
 *       200:
 *         description: Jugador unido al equipo
 */
router.post('/join-by-code',
  hasRole('player'),
    body('code').notEmpty().withMessage('El cdigo es obligatorio'),
    body('playerName').isString().trim().notEmpty().withMessage('El nombre de jugador es obligatorio'),
    body('jerseyNumber').isInt({ min: 1, max: 99 }).withMessage('El dorsal debe ser un nmero entre 1 y 99'),
    handleInputError,
    asyncHandler(TeamInvitationController.joinByCode)
);

// ── Seguir / dejar de seguir equipos (cualquier usuario autenticado) ──────────
router.post(
  "/:teamId/follow",
  param("teamId").isInt().withMessage("ID de equipo inválido"),
  handleInputError,
  asyncHandler(TeamFollowerController.follow)
);

router.delete(
  "/:teamId/follow",
  param("teamId").isInt().withMessage("ID de equipo inválido"),
  handleInputError,
  asyncHandler(TeamFollowerController.unfollow)
);

export default router;
