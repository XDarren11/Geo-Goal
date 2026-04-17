import type {
  AuthTokens,
  CreateAccountInput,
  LoginInput,
} from "../AuthService";

export interface IAuthService {
  createAccount(input: CreateAccountInput): Promise<string>;
  confirmAccount(token: string): Promise<string>;
  login(input: LoginInput): Promise<AuthTokens>;
  requestConfirmationCode(email: string): Promise<string>;
  forgotPassword(email: string): Promise<string>;
  validateToken(token: string): Promise<string>;
  updatePasswordWithToken(token: string, password: string): Promise<string>;
  refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
  revokeRefreshToken(refreshToken: string): Promise<string>;
  revokeAllSessions(userId: number): Promise<string>;
}
