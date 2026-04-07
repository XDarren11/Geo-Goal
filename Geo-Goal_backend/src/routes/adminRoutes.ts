import { Router } from "express";
import { body, param } from "express-validator";
import { AdminController } from "../controllers/AdminController";
import { authenticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { handleInputError } from "../middleware/validation";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authenticate);
router.use(hasRole("admin"));

router.get("/dashboard", asyncHandler(AdminController.dashboardSummary));

// --- Gestión completa de usuarios ---
router.get(
  "/leagues/:leagueId/users",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(AdminController.listUsersByLeague)
);

router.get("/users", asyncHandler(AdminController.listUsers));

router.post(
  "/users",
  body("name").notEmpty().withMessage("El nombre es obligatorio"),
  body("email").isEmail().withMessage("E-mail no válido"),
  body("password")
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres"),
  body("role")
    .isIn(["coach", "player", "admin", "referee"])
    .withMessage("Rol no válido"),
  body("confirmed").optional().isBoolean().withMessage("confirmed debe ser boolean"),
  handleInputError,
  asyncHandler(AdminController.createUser)
);

router.put(
  "/users/:userId",
  param("userId").isInt().withMessage("ID de usuario no válido"),
  body("email").optional().isEmail().withMessage("E-mail no válido"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("La contraseña debe tener al menos 8 caracteres"),
  body("role")
    .optional()
    .isIn(["coach", "player", "admin", "referee"])
    .withMessage("Rol no válido"),
  body("confirmed").optional().isBoolean().withMessage("confirmed debe ser boolean"),
  handleInputError,
  asyncHandler(AdminController.updateUser)
);

router.delete(
  "/users/:userId",
  param("userId").isInt().withMessage("ID de usuario no válido"),
  handleInputError,
  asyncHandler(AdminController.deleteUser)
);

// --- Asignar/designar admins por liga ---
router.get(
  "/leagues/:leagueId/admins",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(AdminController.listLeagueAdmins)
);

router.post(
  "/leagues/:leagueId/admins",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  body("userId").isInt().withMessage("ID de usuario no válido"),
  body("leagueRole")
    .isIn(["principal", "assistant"])
    .withMessage("Rol de liga no válido"),
  handleInputError,
  asyncHandler(AdminController.assignLeagueAdmin)
);

router.put(
  "/leagues/:leagueId/admins/:userId",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  param("userId").isInt().withMessage("ID de usuario no válido"),
  body("leagueRole")
    .isIn(["principal", "assistant"])
    .withMessage("Rol de liga no válido"),
  handleInputError,
  asyncHandler(AdminController.updateLeagueAdminRole)
);

router.delete(
  "/leagues/:leagueId/admins/:userId",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  param("userId").isInt().withMessage("ID de usuario no válido"),
  handleInputError,
  asyncHandler(AdminController.removeLeagueAdmin)
);

// --- Gestión logística de campos ---
router.get("/fields", asyncHandler(AdminController.listFields));

router.get(
  "/fields/:fieldId",
  param("fieldId").isInt().withMessage("ID de campo no válido"),
  handleInputError,
  asyncHandler(AdminController.getFieldById)
);

router.post(
  "/fields",
  body("name").notEmpty().withMessage("El nombre del campo es obligatorio"),
  body("address").notEmpty().withMessage("La dirección es obligatoria"),
  body("lat").isFloat().withMessage("La latitud no es válida"),
  body("lng").isFloat().withMessage("La longitud no es válida"),
  body("capacity").optional().isInt({ min: 0 }).withMessage("Capacidad no válida"),
  body("isActive").optional().isBoolean().withMessage("isActive debe ser boolean"),
  body("leagueId").optional({ values: "falsy" }).isInt().withMessage("leagueId no válido"),
  body("teamId").optional({ values: "falsy" }).isInt().withMessage("teamId no válido"),
  handleInputError,
  asyncHandler(AdminController.createField)
);

router.put(
  "/fields/:fieldId",
  param("fieldId").isInt().withMessage("ID de campo no válido"),
  body("lat").optional().isFloat().withMessage("La latitud no es válida"),
  body("lng").optional().isFloat().withMessage("La longitud no es válida"),
  body("capacity").optional({ values: "falsy" }).isInt({ min: 0 }).withMessage("Capacidad no válida"),
  body("isActive").optional().isBoolean().withMessage("isActive debe ser boolean"),
  body("leagueId").optional({ values: "falsy" }).isInt().withMessage("leagueId no válido"),
  body("teamId").optional({ values: "falsy" }).isInt().withMessage("teamId no válido"),
  handleInputError,
  asyncHandler(AdminController.updateField)
);

router.delete(
  "/fields/:fieldId",
  param("fieldId").isInt().withMessage("ID de campo no válido"),
  handleInputError,
  asyncHandler(AdminController.deleteField)
);

// --- Gestión formal de temporadas ---
router.post(
  "/leagues/:leagueId/seasons",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  body("name").notEmpty().withMessage("El nombre de la temporada es obligatorio"),
  body("year").isInt({ min: 2000 }).withMessage("Año no válido"),
  body("startDate").isISO8601().withMessage("Fecha de inicio no válida"),
  body("endDate").isISO8601().withMessage("Fecha de fin no válida"),
  body("status")
    .optional()
    .isIn(["draft", "active", "finished", "archived"])
    .withMessage("Estado no válido"),
  body("isCurrent").optional().isBoolean().withMessage("isCurrent debe ser boolean"),
  handleInputError,
  asyncHandler(AdminController.createSeason)
);

router.get(
  "/leagues/:leagueId/seasons",
  param("leagueId").isInt().withMessage("ID de liga no válido"),
  handleInputError,
  asyncHandler(AdminController.listSeasonsByLeague)
);

router.get(
  "/seasons/:seasonId",
  param("seasonId").isInt().withMessage("ID de temporada no válido"),
  handleInputError,
  asyncHandler(AdminController.getSeasonById)
);

router.put(
  "/seasons/:seasonId",
  param("seasonId").isInt().withMessage("ID de temporada no válido"),
  body("year").optional().isInt({ min: 2000 }).withMessage("Año no válido"),
  body("startDate").optional().isISO8601().withMessage("Fecha de inicio no válida"),
  body("endDate").optional().isISO8601().withMessage("Fecha de fin no válida"),
  body("status")
    .optional()
    .isIn(["draft", "active", "finished", "archived"])
    .withMessage("Estado no válido"),
  body("isCurrent").optional().isBoolean().withMessage("isCurrent debe ser boolean"),
  handleInputError,
  asyncHandler(AdminController.updateSeason)
);

router.patch(
  "/seasons/:seasonId/status",
  param("seasonId").isInt().withMessage("ID de temporada no válido"),
  body("status")
    .isIn(["draft", "active", "finished", "archived"])
    .withMessage("Estado no válido"),
  handleInputError,
  asyncHandler(AdminController.changeSeasonStatus)
);

router.delete(
  "/seasons/:seasonId",
  param("seasonId").isInt().withMessage("ID de temporada no válido"),
  handleInputError,
  asyncHandler(AdminController.deleteSeason)
);

// --- Auditoría ---
router.get(
  "/audit-logs",
  asyncHandler(AdminController.listAuditLogs)
);

router.get(
  "/audit-logs/:logId",
  param("logId").isInt().withMessage("ID de auditoría no válido"),
  handleInputError,
  asyncHandler(AdminController.getAuditLogById)
);

export default router;
