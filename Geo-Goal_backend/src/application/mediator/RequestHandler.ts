import type { Request } from "./Request";

export interface RequestHandler<TRequest extends Request<TResponse>, TResponse> {
  handle(request: TRequest): Promise<TResponse>;
}
