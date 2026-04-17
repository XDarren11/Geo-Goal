import crypto from "crypto";

/**
 * Token numérico de 6 dígitos para flujos por e-mail (OTP).
 * Usamos `crypto` para evitar `Math.random`, que no es criptográficamente seguro.
 */
export const generateToken = () => crypto.randomInt(100000, 1_000_000).toString();