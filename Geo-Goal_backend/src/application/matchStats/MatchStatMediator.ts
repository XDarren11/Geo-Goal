// 1. Subimos un nivel (..) para entrar a la carpeta 'mediator'
import { Mediator } from "../mediator/Mediator"; 

// 2. Archivos en esta misma carpeta (./)
import { GetTopScorersRequest, UpdatePlayerMatchGoalsRequest, GetMatchPlayersRequest } from "./MatchStatRequests";
import { GetTopScorersHandler, UpdatePlayerMatchGoalsHandler, GetMatchPlayersHandler } from "./MatchStatHandlers";

import { MatchOperationsServiceAdapter } from "../../services/MatchOperationsServiceAdapter";

// === INICIALIZACIÓN ===
export const matchStatMediator = new Mediator();
const matchOperationsService = new MatchOperationsServiceAdapter();

// === REGISTROS ===

// Tabla de goleo
matchStatMediator.register(
  new GetTopScorersRequest(0).requestName, 
  new GetTopScorersHandler()
);

// Actualizar goles
matchStatMediator.register(
  new UpdatePlayerMatchGoalsRequest(0, 0, 0, 0).requestName,
  new UpdatePlayerMatchGoalsHandler()
);

// Obtener jugadores del partido (Pasamos un string vacío como default)
matchStatMediator.register(
  new GetMatchPlayersRequest(0).requestName, 
  new GetMatchPlayersHandler() // 👈 Le quitamos el argumento que tenía adentro
);
