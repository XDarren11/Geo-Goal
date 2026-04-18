export interface IPublicService {
  getNews(limit: number): Promise<unknown>;
  getLeagues(): Promise<unknown>;
  getLeagueDetail(leagueId: string): Promise<unknown>;
  getStandings(leagueId: string): Promise<unknown>;
  getFixture(leagueId: string): Promise<unknown>;
  getFixtureWithLocations(leagueId: string): Promise<unknown>;
  getTeamProfile(leagueId: string, teamId: string): Promise<unknown>;
  getMatchAnalytics(matchId: string): Promise<unknown>;
}
