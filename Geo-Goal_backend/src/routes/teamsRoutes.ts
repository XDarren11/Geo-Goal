import { Router } from "express";
import { authnticate } from "../middleware/auth";
import { hasRole } from "../middleware/role";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { TeamController } from "../controllers/TeamController";
import { upload } from "../middleware/upload";

const router = Router()

router.use(authnticate)

// Router para  equipos

// CREAR, EDITAR Y ELIMINAR EQUIPOS
router.get('/',
    hasRole('coach'),
    TeamController.getMyTeams
)

router.get('/:id',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no valido'),
    handleInputError,
    TeamController.getTeamById
)

router.post('/',
    hasRole('coach'),
    upload.single('logo'),
    body('name')
        .notEmpty().withMessage('El nombre es obligatorio'),
    body('lat').
        notEmpty().withMessage('Falta la latitud'),
    body('lng')
        .notEmpty().withMessage('Falta la longitud'),
    body('fieldAddress')
        .notEmpty().withMessage('La dirección es obligatoria'),
    handleInputError,
    TeamController.createTeam
)

router.put('/:id',
    hasRole('coach'),
    upload.single('logo'),
    param('id').isInt().withMessage('ID no valido'),
    handleInputError,
    TeamController.updateTeam
)

router.delete('/:id',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no valido'),
    TeamController.deleteTeam
)

//AGREGAR RUTAS PARA BUSCAR AL JUGADOR, AGREGARLO AL EQUIPO Y ELIMINARLO DEL EQUIPO 

router.post('/:id/player/find',
    hasRole('coach'),
    param('id').isNumeric().withMessage('ID del equipo no valido'),
    body('email').isEmail().withMessage('E-mail no valido'),
    handleInputError,
    TeamController.findPlayer
)

router.post('/:id/player',
    hasRole('coach'),
    param('id').isNumeric().withMessage('ID de la liga no valido'),
    body('playerId').isNumeric().withMessage('El ID del jugador es obligatorio'),
    handleInputError,
    TeamController.addPlayerToTeam
)

router.get('/:id/player',
    hasRole('coach'),
    param('id').isInt().withMessage('ID no válido'),
    handleInputError,
    TeamController.getPlayersTeam
)

export default router