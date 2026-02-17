import { Router } from "express";
import { authnticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { LeagueController } from "../controllers/LeagueController";
import { TeamController } from "../controllers/TeamController";
import { upload } from "../middleware/upload";

const router = Router()

router.use(authnticate)

router.post('/',
    hasRole('admin'),
    body('name')
        .notEmpty().withMessage('El nombre de la liga es obligatorio'),
    body('description')
        .notEmpty().withMessage('La descripcion debe ser obligatoria'),
    handleInputError,
    LeagueController.createLeague
)

router.get('/',
    hasRole('admin'),
    LeagueController.getAllLeagues
)

router.get('/:leagueId', 
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID no válido'),
    handleInputError,
    LeagueController.getLeagueById
);

router.put('/:leagueId',
    hasRole('admin'),
    body('name')
        .notEmpty().withMessage('El nombre de la liga es obligatorio'),
    body('description')
        .notEmpty().withMessage('La descripcion debe ser obligatoria'),
    handleInputError,
    LeagueController.updateLeague
)

router.delete('/:leagueId',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    handleInputError,
    LeagueController.deleteLegue
)

// BUSCAR, AGREGAR y ELIMINAR EQUIPOS A LA LIGA
router.post('/:leagueId/teams/find',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    body('email').isEmail().withMessage('E-mail no valido'),
    handleInputError,
    LeagueController.getTrainerTeams
)

router.post('/:leagueId/teams',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    body('teamId').isNumeric().withMessage('El ID del equipo es obligatorio'),
    handleInputError,
    LeagueController.addTeamToLeague
)

router.get('/:leagueId/teams',
    hasRole('admin'),
    param('leagueId').isInt().withMessage('ID no válido'),
    handleInputError,
    LeagueController.getTeamsLeague
)

router.delete('/:leagueId/teams/:teamId',
    hasRole('admin'),
    param('leagueId').isNumeric().withMessage('ID de la liga no valido'),
    param('teamId').isNumeric().withMessage('El ID del equipo es obligatorio'),
    handleInputError,
    LeagueController.removeTeamFromLeague
)

export default router