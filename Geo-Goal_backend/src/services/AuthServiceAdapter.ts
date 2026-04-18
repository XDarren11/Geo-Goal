import {
  AuthService,
  type AuthTokens,
  type CreateAccountInput,
  type LoginInput,
} from "./AuthService";
import type { IAuthService } from "./contracts/IAuthService";

export class AuthServiceAdapter implements IAuthService {
  createAccount(input: CreateAccountInput): Promise<string> {
    return AuthService.createAccount(input);
  }

  confirmAccount(token: string): Promise<string> {
    return AuthService.confirmAccount(token);
  }

  login(input: LoginInput): Promise<AuthTokens> {
    return AuthService.login(input);
  }

  requestConfirmationCode(email: string): Promise<string> {
    return AuthService.requestConfirmationCode(email);
  }

  forgotPassword(email: string): Promise<string> {
    return AuthService.forgotPassword(email);
  }

  validateToken(token: string): Promise<string> {
    return AuthService.validateToken(token);
  }

  updatePasswordWithToken(token: string, password: string): Promise<string> {
    return AuthService.updatePasswordWithToken(token, password);
  }

  refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    return AuthService.refreshAccessToken(refreshToken);
  }

  revokeRefreshToken(refreshToken: string): Promise<string> {
    return AuthService.revokeRefreshToken(refreshToken);
  }

  revokeAllSessions(userId: number): Promise<string> {
    return AuthService.revokeAllSessions(userId);
  }
}
