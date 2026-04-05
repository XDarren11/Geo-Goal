import type { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

/**
 * Handlers de autenticación: solo extraen datos del request,
 * llaman al servicio y envían la respuesta.
 */
export class AuthController {
  static createAccount = async (req: Request, res: Response): Promise<void> => {
    const result = await AuthService.createAccount(req.body);
    res.send(result);
  };

  static confirmAccount = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    const result = await AuthService.confirmAccount(token);
    res.send(result);
  };

  static login = async (req: Request, res: Response): Promise<void> => {
    const result = await AuthService.login(req.body);
    res.send(result);
  };

  static requestConfirmationCode = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const result = await AuthService.requestConfirmationCode(email);
    res.send(result);
  };

  static forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);
    res.send(result);
  };

  static validateToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    const result = await AuthService.validateToken(token);
    res.send(result);
  };

  static updatePasswordWithToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const { password } = req.body;
    const result = await AuthService.updatePasswordWithToken(token, password);
    res.send(result);
  };

  static user = async (req: Request, res: Response): Promise<void> => {
    res.json(req.user);
  };
}
