import { Mediator } from "../../mediator/Mediator";
import type { ITeamInvitationService } from "../../../services/contracts/ITeamInvitationService";
import {
  GenerateTeamInvitationHandler,
  GetTeamInvitationHandler,
  JoinTeamByCodeHandler,
  RevokeTeamInvitationHandler,
} from "./handlers/TeamInvitationHandlers";

export function buildTeamInvitationMediator(svc: ITeamInvitationService): Mediator {
  const m = new Mediator();
  m.register("teamInvitation.generate", new GenerateTeamInvitationHandler(svc));
  m.register("teamInvitation.get", new GetTeamInvitationHandler(svc));
  m.register("teamInvitation.join", new JoinTeamByCodeHandler(svc));
  m.register("teamInvitation.revoke", new RevokeTeamInvitationHandler(svc));
  return m;
}
