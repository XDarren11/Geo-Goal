import type { Request, Response } from "express";
import { clearLoginThrottle } from "../middleware/loginThrottle";
import { buildAuthMediator } from "../application/auth/AuthMediator";
import { AuthServiceAdapter } from "../services/AuthServiceAdapter";
import {
  ConfirmAccountRequest,
  CreateAccountRequest,
  ForgotPasswordRequest,
  LoginRequest,
  LogoutAllRequest,
  LogoutRequest,
  RefreshAccessTokenRequest,
  RequestConfirmationCodeRequest,
  UpdatePasswordRequest,
  ValidateTokenRequest,
  ClientCredentialsRequest,
} from "../application/auth/requests/AuthRequests";

const authMediator = buildAuthMediator(new AuthServiceAdapter());

/**
 * Handlers de autenticación: solo extraen datos del request,
 * llaman al servicio y envían la respuesta.
 */
export class AuthController {
  static createAccount = async (req: Request, res: Response): Promise<void> => {
    const result = await authMediator.send(new CreateAccountRequest(req.body));
    res.send(result);
  };

  static confirmAccount = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    const result = await authMediator.send(new ConfirmAccountRequest(token));
    res.send(result);
  };

  static login = async (req: Request, res: Response): Promise<void> => {
    const result = await authMediator.send(new LoginRequest(req.body));
    if (typeof req.body?.email === "string") {
      clearLoginThrottle(req.body.email, req.ip);
    }
    res.send(result);
  };

  static requestConfirmationCode = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const result = await authMediator.send(new RequestConfirmationCodeRequest(email));
    res.send(result);
  };

  static forgotPassword = async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;
    const result = await authMediator.send(new ForgotPasswordRequest(email));
    res.send(result);
  };

  static validateToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.body;
    const result = await authMediator.send(new ValidateTokenRequest(token));
    res.send(result);
  };

  static updatePasswordWithToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const { password } = req.body;
    const result = await authMediator.send(new UpdatePasswordRequest({ token, password }));
    res.send(result);
  };

  static user = async (req: Request, res: Response): Promise<void> => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(req.user);
  };

  static refreshToken = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await authMediator.send(new RefreshAccessTokenRequest({ refreshToken }));
    res.send(result);
  };

  static logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    const result = await authMediator.send(new LogoutRequest({ refreshToken }));
    res.send(result);
  };

  static logoutAll = async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "No autorizado" });
      return;
    }
    const result = await authMediator.send(new LogoutAllRequest(req.user.id));
    res.send(result);
  };

  static clientCredentialsToken = async (req: Request, res: Response): Promise<void> => {
    const { client_id, client_secret } = req.body;
    const result = await authMediator.send(
      new ClientCredentialsRequest({ clientId: client_id, clientSecret: client_secret })
    );
    res.send(result);
  };
}
