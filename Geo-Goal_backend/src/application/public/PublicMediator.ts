import { Mediator } from "../mediator/Mediator";
import type { IPublicService } from "../../services/contracts/IPublicService";
import {
  GetLeagueDetailHandler,
  GetLeaguesHandler,
  GetNewsHandler,
  GetPublicFixtureHandler,
  GetPublicFixtureWithLocationsHandler,
  GetPublicMatchAnalyticsHandler,
  GetPublicStandingsHandler,
  GetTeamProfileHandler,
} from "./handlers/PublicHandlers";

export function buildPublicMediator(publicService: IPublicService): Mediator {
  const m = new Mediator();
  m.register("public.getNews", new GetNewsHandler(publicService));
  m.register("public.getLeagues", new GetLeaguesHandler(publicService));
  m.register("public.getLeagueDetail", new GetLeagueDetailHandler(publicService));
  m.register("public.getStandings", new GetPublicStandingsHandler(publicService));
  m.register("public.getFixture", new GetPublicFixtureHandler(publicService));
  m.register(
    "public.getFixtureWithLocations",
    new GetPublicFixtureWithLocationsHandler(publicService)
  );
  m.register("public.getTeamProfile", new GetTeamProfileHandler(publicService));
  m.register("public.getMatchAnalytics", new GetPublicMatchAnalyticsHandler(publicService));
  return m;
}
