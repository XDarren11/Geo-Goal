import { Mediator } from "../../mediator/Mediator";
import type { ILeagueInvitationService } from "../../../services/contracts/ILeagueInvitationService";
import {
  GenerateLeagueInvitationHandler,
  GetLeagueInvitationHandler,
  JoinLeagueByCodeHandler,
  RevokeLeagueInvitationHandler,
} from "./handlers/LeagueInvitationHandlers";

export function buildLeagueInvitationMediator(svc: ILeagueInvitationService): Mediator {
  const m = new Mediator();
  m.register("leagueInvitation.generate", new GenerateLeagueInvitationHandler(svc));
  m.register("leagueInvitation.get", new GetLeagueInvitationHandler(svc));
  m.register("leagueInvitation.join", new JoinLeagueByCodeHandler(svc));
  m.register("leagueInvitation.revoke", new RevokeLeagueInvitationHandler(svc));
  return m;
}
