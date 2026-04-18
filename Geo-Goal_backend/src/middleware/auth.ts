import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { JWT_AUDIENCE, JWT_ISSUER } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

type JwtPayloadWithId = {
  id: number;
  tokenVersion: number;
};

const unauthorized = (res: Response, message = "No autorizado") =>
  res.status(401).json({ error: message });

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return unauthorized(res);
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return unauthorized(res, "Formato de autorización inválido");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    return res.status(500).json({ error: "Configuración de autenticación inválida" });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      algorithms: ["HS256"],
    });

    if (
      typeof decoded !== "object" ||
      !("id" in decoded) ||
      !("tokenVersion" in decoded) ||
      typeof (decoded as JwtPayloadWithId).id !== "number" ||
      typeof (decoded as JwtPayloadWithId).tokenVersion !== "number"
    ) {
      return unauthorized(res, "Token inválido");
    }

    const payload = decoded as JwtPayloadWithId;
    const user = await User.findByPk(payload.id, {
      attributes: ["id", "name", "email", "role", "tokenVersion"],
    });

    if (!user) {
      return unauthorized(res, "Token inválido");
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      return unauthorized(res, "Sesión inválida");
    }

    req.user = user;
    next();
  } catch {
    return unauthorized(res, "Token inválido o expirado");
  }
};