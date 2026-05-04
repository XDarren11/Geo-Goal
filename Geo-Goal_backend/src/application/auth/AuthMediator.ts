import { Mediator } from "../mediator/Mediator";
import type { IAuthService } from "../../services/contracts/IAuthService";
import {
  ConfirmAccountHandler,
  CreateAccountHandler,
  ForgotPasswordHandler,
  LoginHandler,
  LogoutAllHandler,
  LogoutHandler,
  RefreshAccessTokenHandler,
  RequestConfirmationCodeHandler,
  UpdatePasswordHandler,
  ValidateTokenHandler,
  ClientCredentialsHandler,
} from "./handlers/AuthHandlers";
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
} from "./requests/AuthRequests";

export function buildAuthMediator(authService: IAuthService): Mediator {
  const mediator = new Mediator();

  mediator.register("auth.createAccount", new CreateAccountHandler(authService));
  mediator.register("auth.confirmAccount", new ConfirmAccountHandler(authService));
  mediator.register("auth.login", new LoginHandler(authService));
  mediator.register(
    "auth.requestConfirmationCode",
    new RequestConfirmationCodeHandler(authService)
  );
  mediator.register("auth.forgotPassword", new ForgotPasswordHandler(authService));
  mediator.register("auth.validateToken", new ValidateTokenHandler(authService));
  mediator.register("auth.updatePassword", new UpdatePasswordHandler(authService));
  mediator.register("auth.refreshAccessToken", new RefreshAccessTokenHandler(authService));
  mediator.register("auth.logout", new LogoutHandler(authService));
  mediator.register("auth.logoutAll", new LogoutAllHandler(authService));
  mediator.register("auth.clientCredentialsGrant", new ClientCredentialsHandler(authService));

  return mediator;
}

export type AuthRequests =
  | CreateAccountRequest
  | ConfirmAccountRequest
  | LoginRequest
  | RequestConfirmationCodeRequest
  | ForgotPasswordRequest
  | ValidateTokenRequest
  | UpdatePasswordRequest
  | RefreshAccessTokenRequest
  | LogoutRequest
  | LogoutAllRequest
  | ClientCredentialsRequest;
