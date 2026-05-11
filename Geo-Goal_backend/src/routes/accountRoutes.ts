import { Router } from "express";
import { body } from "express-validator";
import { authenticate } from "../middleware/auth";
import { handleInputError } from "../middleware/validation";
import { asyncHandler } from "../middleware/asyncHandler";
import { AccountController } from "../controllers/AccountController";

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

export default router;
