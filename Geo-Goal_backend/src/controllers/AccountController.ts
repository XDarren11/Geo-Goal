import type { Request, Response } from "express";
import { AccountService } from "../services/AccountService";

export class AccountController {
  static me = async (req: Request, res: Response): Promise<void> => {
    const user = await AccountService.getProfile(req.user!.id);
    res.json(user);
  };

  static updateUsername = async (req: Request, res: Response): Promise<void> => {
    const { username } = req.body;
    const result = await AccountService.updateUsername(req.user!.id, username);
    res.json(result);
  };

  static updatePassword = async (req: Request, res: Response): Promise<void> => {
    const { currentPassword, newPassword, newPasswordConfirmation } = req.body;
    const message = await AccountService.updatePassword(
      req.user!.id,
      currentPassword,
      newPassword,
      newPasswordConfirmation
    );
    res.json({ message });
  };

  static resendConfirmationEmail = async (req: Request, res: Response): Promise<void> => {
    const message = await AccountService.resendConfirmationEmail(req.user!.id);
    res.json({ message });
  };
}
