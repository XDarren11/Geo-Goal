import type { Request } from "../../mediator/Request";
import type {
  CreateAccountDTO,
  LoginDTO,
  RefreshTokenDTO,
  UpdatePasswordDTO,
} from "../dto/AuthDTOs";
import type { AuthTokens } from "../../../services/AuthService";

abstract class AuthRequest<TResponse> implements Request<TResponse> {
  abstract readonly requestName: string;
}

export class CreateAccountRequest extends AuthRequest<string> {
  readonly requestName = "auth.createAccount";
  constructor(public readonly payload: CreateAccountDTO) {
    super();
  }
}

export class ConfirmAccountRequest extends AuthRequest<string> {
  readonly requestName = "auth.confirmAccount";
  constructor(public readonly token: string) {
    super();
  }
}

export class LoginRequest extends AuthRequest<AuthTokens> {
  readonly requestName = "auth.login";
  constructor(public readonly payload: LoginDTO) {
    super();
  }
}

export class RequestConfirmationCodeRequest extends AuthRequest<string> {
  readonly requestName = "auth.requestConfirmationCode";
  constructor(public readonly email: string) {
    super();
  }
}

export class ForgotPasswordRequest extends AuthRequest<string> {
  readonly requestName = "auth.forgotPassword";
  constructor(public readonly email: string) {
    super();
  }
}

export class ValidateTokenRequest extends AuthRequest<string> {
  readonly requestName = "auth.validateToken";
  constructor(public readonly token: string) {
    super();
  }
}

export class UpdatePasswordRequest extends AuthRequest<string> {
  readonly requestName = "auth.updatePassword";
  constructor(public readonly payload: UpdatePasswordDTO) {
    super();
  }
}

export class RefreshAccessTokenRequest extends AuthRequest<AuthTokens> {
  readonly requestName = "auth.refreshAccessToken";
  constructor(public readonly payload: RefreshTokenDTO) {
    super();
  }
}

export class LogoutRequest extends AuthRequest<string> {
  readonly requestName = "auth.logout";
  constructor(public readonly payload: RefreshTokenDTO) {
    super();
  }
}

export class LogoutAllRequest extends AuthRequest<string> {
  readonly requestName = "auth.logoutAll";
  constructor(public readonly userId: number) {
    super();
  }
}
