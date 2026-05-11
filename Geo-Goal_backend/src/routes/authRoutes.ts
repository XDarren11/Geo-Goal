import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { loginThrottle } from "../middleware/loginThrottle";

const router = Router();

router.post(
  "/create-account",
  body("name").notEmpty().withMessage("El nombre no puede ir vacío"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña es muy corta, mínimo 8 caracteres"),
  body("password_confirmation").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Las contraseñas no coinciden");
    return true;
  }),
  body("email").isEmail().withMessage("E-mail no válido"),
  body("role")
    .notEmpty().withMessage("El rol es obligatorio")
    .isIn(["coach", "player", "admin", "referee"])
    .withMessage("Rol no válido"),
  handleInputError,
  asyncHandler(AuthController.createAccount)
);

router.post(
  "/confirm-account",
  body("token").notEmpty().withMessage("El token no puede ir vacío"),
  handleInputError,
  asyncHandler(AuthController.confirmAccount)
);

router.post(
  "/login",
  loginThrottle,
  body("email").isEmail().withMessage("E-mail no válido"),
  body("password").notEmpty().withMessage("La contraseña no puede ir vacía"),
  handleInputError,
  asyncHandler(AuthController.login)
);

router.post(
  "/request-code",
  body("email").isEmail().withMessage("E-mail no válido"),
  handleInputError,
  asyncHandler(AuthController.requestConfirmationCode)
);

router.post(
  "/forgot-password",
  body("email").isEmail().withMessage("E-mail no válido"),
  handleInputError,
  asyncHandler(AuthController.forgotPassword)
);

router.post(
  "/validate-token",
  body("token").notEmpty().withMessage("El token no puede ir vacío"),
  handleInputError,
  asyncHandler(AuthController.validateToken)
);

router.post(
  "/update-password/:token",
  param("token").isNumeric().withMessage("Token no válido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña es muy corta, mínimo 8 caracteres"),
  body("password_confirmation").custom((value, { req }) => {
    if (value !== req.body.password) throw new Error("Las contraseñas no coinciden");
    return true;
  }),
  handleInputError,
  asyncHandler(AuthController.updatePasswordWithToken)
);

router.get("/user", authenticate, asyncHandler(AuthController.user));

router.post(
  "/refresh-token",
  body("refreshToken").notEmpty().withMessage("refreshToken es obligatorio"),
  handleInputError,
  asyncHandler(AuthController.refreshToken)
);

router.post(
  "/logout",
  body("refreshToken").notEmpty().withMessage("refreshToken es obligatorio"),
  handleInputError,
  asyncHandler(AuthController.logout)
);

router.post("/logout-all", authenticate, asyncHandler(AuthController.logoutAll));

router.post(
  "/oauth/token",
  body("grant_type").equals("client_credentials").withMessage('grant_type debe ser "client_credentials"'),
  body("client_id").notEmpty().withMessage("client_id es obligatorio"),
  body("client_secret").notEmpty().withMessage("client_secret es obligatorio"),
  handleInputError,
  asyncHandler(AuthController.clientCredentialsToken)
);

export default router