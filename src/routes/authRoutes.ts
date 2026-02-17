import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { authnticate } from "../middleware/auth";

const router = Router()

router.post('/create-account',
    body('name')
        .notEmpty().withMessage('El nombre no puede ir vacio'),
    body('password')
        .isLength({min: 8}).withMessage('La contraseña es muy corta, minimo 8 caracteres'),
    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password) {
            throw new Error('Las contraseñas no son iguales')
        }
        return true
    }),
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    body('role')
        .notEmpty().withMessage('El rol es obligatorio')
        .isIn(['coach', 'player', 'admin']).withMessage('Rol no es valido'),
    handleInputError,
    AuthController.createAccount
)

router.post('/confirm-account',
    body('token')
        .notEmpty().withMessage('El Token no puede ir vacio'),
    handleInputError,
    AuthController.confirmAccount
)

router.post('/login',
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    body('password')
        .notEmpty().withMessage('La contraseña no puede ir vacia'),
    handleInputError,
    AuthController.login
)

router.post('/request-code',
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    handleInputError,
    AuthController.requestConfirmationCode
)

router.post('/forgot-password',
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    handleInputError,
    AuthController.forgotPassword
)

router.post('/validate-token',
    body('token')
        .notEmpty().withMessage('El Token no puede ir vacio'),
    handleInputError,
    AuthController.validateToken
)

router.post('/update-password/:token',
    param('token')
        .isNumeric().withMessage('Token no valido'),
    body('password')
        .isLength({min: 8}).withMessage('La contraseña es muy corta, minimo 8 caracteres'),
    body('password_confirmation').custom((value, {req}) => {
        if(value !== req.body.password) {
            throw new Error('Las contraseñas no son iguales')
        }
        return true
    }),
    handleInputError,
    AuthController.updatePasswordWithToken
)

router.get('/user',
    authnticate,
    AuthController.user
)


export default router