import crypto from "crypto";

const REFRESH_TOKEN_BYTES = 48;

export const generateRefreshToken = (): string =>
  crypto.randomBytes(REFRESH_TOKEN_BYTES).toString("base64url");

export const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

