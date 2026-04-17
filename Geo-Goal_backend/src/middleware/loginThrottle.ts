import type { Request, Response, NextFunction } from "express";

type Bucket = {
  count: number;
  firstAttemptAt: number;
  blockedUntil: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 7;
const BLOCK_MS = 15 * 60 * 1000;
const buckets = new Map<string, Bucket>();

const getKey = (req: Request): string => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "unknown";
  const ip = req.ip || "unknown-ip";
  return `${email}::${ip}`;
};

export const clearLoginThrottle = (email: string, ip?: string) => {
  const key = `${email.trim().toLowerCase()}::${ip || "unknown-ip"}`;
  buckets.delete(key);
};

export const loginThrottle = (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = getKey(req);
  const bucket = buckets.get(key);

  if (!bucket) {
    buckets.set(key, { count: 1, firstAttemptAt: now, blockedUntil: 0 });
    return next();
  }

  if (bucket.blockedUntil > now) {
    const retryAfter = Math.ceil((bucket.blockedUntil - now) / 1000);
    res.setHeader("Retry-After", retryAfter.toString());
    res.status(429).json({ error: "Demasiados intentos, intenta más tarde" });
    return;
  }

  if (now - bucket.firstAttemptAt > WINDOW_MS) {
    buckets.set(key, { count: 1, firstAttemptAt: now, blockedUntil: 0 });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > MAX_ATTEMPTS) {
    bucket.blockedUntil = now + BLOCK_MS;
    const retryAfter = Math.ceil(BLOCK_MS / 1000);
    res.setHeader("Retry-After", retryAfter.toString());
    res.status(429).json({ error: "Demasiados intentos, intenta más tarde" });
    return;
  }

  buckets.set(key, bucket);
  next();
};

