import type { Request } from "./Request";
import type { RequestHandler } from "./RequestHandler";
import { AppError } from "../../types/errors";

type GenericRequest = Request<unknown>;
type GenericHandler = RequestHandler<GenericRequest, unknown>;

export class Mediator {
  private readonly handlers = new Map<string, GenericHandler>();

  register<TRequest extends Request<TResponse>, TResponse>(
    requestName: string,
    handler: RequestHandler<TRequest, TResponse>
  ): void {
    this.handlers.set(requestName, handler as GenericHandler);
  }

  async send<TResponse>(request: Request<TResponse>): Promise<TResponse> {
    const handler = this.handlers.get(request.requestName);
    if (!handler) {
      throw new AppError(500, `No existe handler para ${request.requestName}`);
    }
    return handler.handle(request as GenericRequest) as Promise<TResponse>;
  }
}
