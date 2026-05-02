import type { RequestHandler } from "../../mediator/RequestHandler";
import type { IAuthService } from "../../../services/contracts/IAuthService";
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
} from "../requests/AuthRequests";

export class CreateAccountHandler implements RequestHandler<CreateAccountRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: CreateAccountRequest): Promise<string> {
    return this.authService.createAccount(request.payload);
  }
}

export class ConfirmAccountHandler implements RequestHandler<ConfirmAccountRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: ConfirmAccountRequest): Promise<string> {
    return this.authService.confirmAccount(request.token);
  }
}

export class LoginHandler implements RequestHandler<LoginRequest, Awaited<ReturnType<IAuthService["login"]>>> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: LoginRequest): ReturnType<IAuthService["login"]> {
    return this.authService.login(request.payload);
  }
}

export class RequestConfirmationCodeHandler
  implements RequestHandler<RequestConfirmationCodeRequest, string>
{
  constructor(private readonly authService: IAuthService) {}

  handle(request: RequestConfirmationCodeRequest): Promise<string> {
    return this.authService.requestConfirmationCode(request.email);
  }
}

export class ForgotPasswordHandler implements RequestHandler<ForgotPasswordRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: ForgotPasswordRequest): Promise<string> {
    return this.authService.forgotPassword(request.email);
  }
}

export class ValidateTokenHandler implements RequestHandler<ValidateTokenRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: ValidateTokenRequest): Promise<string> {
    return this.authService.validateToken(request.token);
  }
}

export class UpdatePasswordHandler implements RequestHandler<UpdatePasswordRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: UpdatePasswordRequest): Promise<string> {
    return this.authService.updatePasswordWithToken(request.payload.token, request.payload.password);
  }
}

export class RefreshAccessTokenHandler
  implements
    RequestHandler<RefreshAccessTokenRequest, Awaited<ReturnType<IAuthService["refreshAccessToken"]>>>
{
  constructor(private readonly authService: IAuthService) {}

  handle(request: RefreshAccessTokenRequest): ReturnType<IAuthService["refreshAccessToken"]> {
    return this.authService.refreshAccessToken(request.payload.refreshToken);
  }
}

export class LogoutHandler implements RequestHandler<LogoutRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: LogoutRequest): Promise<string> {
    return this.authService.revokeRefreshToken(request.payload.refreshToken);
  }
}

export class LogoutAllHandler implements RequestHandler<LogoutAllRequest, string> {
  constructor(private readonly authService: IAuthService) {}

  handle(request: LogoutAllRequest): Promise<string> {
    return this.authService.revokeAllSessions(request.userId);
  }
}

export class ClientCredentialsHandler
  implements RequestHandler<ClientCredentialsRequest, Awaited<ReturnType<IAuthService["clientCredentialsGrant"]>>>
{
  constructor(private readonly authService: IAuthService) {}

  handle(request: ClientCredentialsRequest): ReturnType<IAuthService["clientCredentialsGrant"]> {
    return this.authService.clientCredentialsGrant(
      request.payload.clientId,
      request.payload.clientSecret,
    );
  }
}
