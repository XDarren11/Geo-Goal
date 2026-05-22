import type { Request } from "../mediator/Request";

abstract class MR<T> implements Request<T> {
  abstract readonly requestName: string;
}

// Request para consultar la tabla de goleo
export class GetTopScorersRequest extends MR<any[]> {
  readonly requestName = "stats.getTopScorers";
  constructor(public readonly leagueId: number) {
    super();
  }
}

// Request para capturar goles de un jugador en un partido
export class UpdatePlayerMatchGoalsRequest extends MR<{ message: string }> {
  readonly requestName = "stats.updatePlayerGoals";
  constructor(
    public readonly matchId: number,
    public readonly teamId: number,
    public readonly playerId: number,
    public readonly goals: number
  ) {
    super();
  }
}

export class GetMatchPlayersRequest extends MR<any[]> {
  readonly requestName = "match.getPlayers";
  constructor(public readonly matchId: number) {
    super();
  }
}