import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Client } from "../models/Client";
import { JWT_AUDIENCE, JWT_ISSUER, JWT_TYPE_M2M } from "../utils/jwt";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      client?: Client;
    }
  }
}

type JwtPayloadWithId = {
  id: number;
  tokenVersion: number;
};

type M2MPayload = {
  type: string;
  clientId: string;
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

    if (typeof decoded !== "object") {
      return unauthorized(res, "Token inválido");
    }

    if ((decoded as M2MPayload).type === JWT_TYPE_M2M) {
      const payload = decoded as M2MPayload & { permissions: string[]; name: string };
      if (!payload.clientId) {
        return unauthorized(res, "Token M2M inválido");
      }

      const client = await Client.findOne({
        where: { clientId: payload.clientId },
        attributes: ["id", "clientId", "name", "active", "permissions"],
      });

      if (!client || !client.active) {
        return unauthorized(res, "Cliente inválido o inactivo");
      }

      req.client = client;
      req.user = {
        id: -1,
        name: client.name,
        email: `${client.clientId}@m2m.internal`,
        username: null,
        confirmed: true,
        role: "admin",
        tokenVersion: 0,
      } as User;

      return next();
    }

    if (
      !("id" in decoded) ||
      !("tokenVersion" in decoded) ||
      typeof (decoded as JwtPayloadWithId).id !== "number" ||
      typeof (decoded as JwtPayloadWithId).tokenVersion !== "number"
    ) {
      return unauthorized(res, "Token inválido");
    }

    const payload = decoded as JwtPayloadWithId;
    const user = await User.findByPk(payload.id, {
      attributes: ["id", "name", "email", "username", "confirmed", "role", "tokenVersion"],
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
