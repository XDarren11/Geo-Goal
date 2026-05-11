import { PublicService } from "./PublicService";
import type { IPublicService } from "./contracts/IPublicService";

export class PublicServiceAdapter implements IPublicService {
  getNews(limit: number): Promise<unknown> {
    return PublicService.getNews(limit);
  }

  getLeagues(page = 1, pageSize = 50): Promise<unknown> {
    return PublicService.getLeagues(page, pageSize);
  }

  getLeagueDetail(leagueId: string): Promise<unknown> {
    return PublicService.getLeagueDetail(leagueId);
  }

  getStandings(leagueId: string): Promise<unknown> {
    return PublicService.getStandings(leagueId);
  }

  getFixture(leagueId: string): Promise<unknown> {
    return PublicService.getFixture(leagueId);
  }

  getFixtureWithLocations(leagueId: string): Promise<unknown> {
    return PublicService.getFixtureWithLocations(leagueId);
  }

  getTeamProfile(leagueId: string, teamId: string): Promise<unknown> {
    return PublicService.getTeamProfile(leagueId, teamId);
  }

  getMatchAnalytics(matchId: string): Promise<unknown> {
    return PublicService.getMatchAnalytics(matchId);
  }
}
