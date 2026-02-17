import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { body, param } from "express-validator";
import { handleInputError } from "../middleware/validation";
import { authnticate } from "../middleware/auth";
import { authLimiter, registerLimiter, emailLimiter } from "../middleware/rateLimiter";

const router = Router()

/**
 * @swagger
 * /api/auth/create-account:
 *   post:
 *     summary: Crear una nueva cuenta de usuario
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *               - password_confirmation
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: password123
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [coach, player, admin]
 *                 example: player
 *     responses:
 *       200:
 *         description: Cuenta creada exitosamente
 *       400:
 *         description: Error de validación
 */
router.post('/create-account',
    registerLimiter, // Rate limiter para registro
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

/**
 * @swagger
 * /api/auth/confirm-account:
 *   post:
 *     summary: Confirmar cuenta con token de verificación
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Cuenta confirmada exitosamente
 *       400:
 *         description: Token inválido o expirado
 */
router.post('/confirm-account',
    body('token')
        .notEmpty().withMessage('El Token no puede ir vacio'),
    handleInputError,
    AuthController.confirmAccount
)

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: juan@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login',
    authLimiter, // Rate limiter para login
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    body('password')
        .notEmpty().withMessage('La contraseña no puede ir vacia'),
    handleInputError,
    AuthController.login
)

/**
 * @swagger
 * /api/auth/request-code:
 *   post:
 *     summary: Solicitar nuevo código de confirmación
 *     tags: [Autenticación]
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
 *                 example: juan@example.com
 *     responses:
 *       200:
 *         description: Código enviado exitosamente
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/request-code',
    emailLimiter, // Rate limiter para emails
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    handleInputError,
    AuthController.requestConfirmationCode
)

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar recuperación de contraseña
 *     tags: [Autenticación]
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
 *                 example: juan@example.com
 *     responses:
 *       200:
 *         description: Email de recuperación enviado
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/forgot-password',
    emailLimiter, // Rate limiter para emails
    body('email')
        .isEmail().withMessage('E-mail no valido'),
    handleInputError,
    AuthController.forgotPassword
)

/**
 * @swagger
 * /api/auth/validate-token:
 *   post:
 *     summary: Validar token de recuperación de contraseña
 *     tags: [Autenticación]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Token válido
 *       404:
 *         description: Token inválido o expirado
 */
router.post('/validate-token',
    body('token')
        .notEmpty().withMessage('El Token no puede ir vacio'),
    handleInputError,
    AuthController.validateToken
)

/**
 * @swagger
 * /api/auth/update-password/{token}:
 *   post:
 *     summary: Actualizar contraseña con token
 *     tags: [Autenticación]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Token de recuperación
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *               - password_confirmation
 *             properties:
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: newPassword123
 *               password_confirmation:
 *                 type: string
 *                 format: password
 *                 example: newPassword123
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Error de validación
 */
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

/**
 * @swagger
 * /api/auth/user:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     tags: [Autenticación]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Información del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 name:
 *                   type: string
 *                 email:
 *                   type: string
 *                 role:
 *                   type: string
 *       401:
 *         description: No autorizado
 */
router.get('/user',
    authnticate,
    AuthController.user
)


export default router