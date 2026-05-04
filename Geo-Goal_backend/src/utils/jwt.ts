import jwt from "jsonwebtoken";

type UserPayload = {
  id: number;
  tokenVersion: number;
};

export type ClientPayload = {
  type: "m2m";
  clientId: string;
  name: string;
  permissions: string[];
};

export const JWT_ISSUER = "geo-goal-api";
export const JWT_AUDIENCE = "geo-goal-clients";
export const JWT_TYPE_M2M = "m2m";

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

export const generateM2MJWT = (payload: ClientPayload) => {
  const expiresIn = (process.env.M2M_JWT_EXPIRES_IN || "1h") as jwt.SignOptions["expiresIn"];
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