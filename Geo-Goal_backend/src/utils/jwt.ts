import jwt from "jsonwebtoken";

type UserPayload = {
  id: number;
  tokenVersion: number;
};

export const JWT_ISSUER = "geo-goal-api";
export const JWT_AUDIENCE = "geo-goal-clients";

export const generateJWT = (payload: UserPayload) => {
  const expiresIn = (process.env.JWT_EXPIRES_IN || "7d") as jwt.SignOptions["expiresIn"];
  const signOptions: jwt.SignOptions = {
    expiresIn,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  };
  const token = jwt.sign(payload, getJwtSecret(), signOptions);
  return token;
};

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET ausente o inseguro (mínimo 32 caracteres).");
  }
  return secret;
};