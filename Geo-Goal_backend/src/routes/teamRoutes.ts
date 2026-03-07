import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { TeamController } from "../controllers/TeamController";
import { upload } from "../middleware/upload";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authenticate);

router.get("/", hasRole("coach"), asyncHandler(TeamController.getMyTeams));

router.get(
  "/:id",
  hasRole("coach"),
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
  body("email").isEmail().withMessage("E-mail no válido"),
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
  hasRole("coach"),
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

export default router;
