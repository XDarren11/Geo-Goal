import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { NotificationController } from '../controllers/NotificationController';
import { asyncHandler } from '../middleware/asyncHandler';
import { handleInputError } from '../middleware/validation';
import { param } from 'express-validator';

const router = Router();

router.use(authenticate);

router.get('/', asyncHandler(NotificationController.myNotifications));

router.patch(
  '/:notificationId/read',
  param('notificationId').isInt().withMessage('ID de notificación no válido'),
  handleInputError,
  asyncHandler(NotificationController.markAsRead)
);

router.patch('/read-all', asyncHandler(NotificationController.markAllAsRead));

export default router;
