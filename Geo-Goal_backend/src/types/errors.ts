/**
 * Error de aplicación con código HTTP.
 * Los servicios lanzan AppError para que el middleware de error
 * responda con el status correcto.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
