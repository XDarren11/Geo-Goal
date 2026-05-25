import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate } from "../middleware/auth";
import { handleInputError } from "../middleware/validation";
import { asyncHandler } from "../middleware/asyncHandler";
import { AccountController } from "../controllers/AccountController";
import { TeamFollowerController } from "../controllers/TeamFollowerController";
import { DeviceTokenController } from "../controllers/DeviceTokenController";

const router = Router();

router.use(authenticate);

router.get("/me", asyncHandler(AccountController.me));

router.patch(
  "/username",
  body("username")
    .notEmpty().withMessage("El nombre de usuario no puede estar vacío")
    .matches(/^@?[a-zA-Z0-9_]{3,20}$/).withMessage("El nombre de usuario debe tener 3-20 caracteres y solo puede contener letras, números y guiones bajos"),
  handleInputError,
  asyncHandler(AccountController.updateUsername)
);

router.patch(
  "/password",
  body("currentPassword").notEmpty().withMessage("La contraseña actual no puede estar vacía"),
  body("newPassword").isLength({ min: 8 }).withMessage("La contraseña es muy corta, mínimo 8 caracteres"),
  body("newPasswordConfirmation").custom((value, { req }) => {
    if (value !== req.body.newPassword) throw new Error("Las contraseñas no coinciden");
    return true;
  }),
  handleInputError,
  asyncHandler(AccountController.updatePassword)
);

router.post("/resend-confirmation", asyncHandler(AccountController.resendConfirmationEmail));

// ── Equipos seguidos ──────────────────────────────────────────────────────────
router.get("/followed-teams", asyncHandler(TeamFollowerController.listFollowed));
router.get("/followed-team-ids", asyncHandler(TeamFollowerController.getFollowedTeamIds));

// ── Device tokens (push móvil) ────────────────────────────────────────────────
router.post(
  "/device-tokens",
  body("token").isString().notEmpty().withMessage("token es requerido"),
  body("platform")
    .isIn(["ios", "android", "web"])
    .withMessage("platform debe ser ios, android o web"),
  handleInputError,
  asyncHandler(DeviceTokenController.register)
);

router.delete(
  "/device-tokens/:token",
  param("token").isString().notEmpty(),
  handleInputError,
  asyncHandler(DeviceTokenController.unregister)
);

export default router;
