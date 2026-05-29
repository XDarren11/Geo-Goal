import type { Request, Response } from "express";
import { DeviceToken } from "../models/DeviceToken";

export class DeviceTokenController {
  static register = async (req: Request, res: Response): Promise<void> => {
    const { token, platform } = req.body as {
      token: string;
      platform: "ios" | "android" | "web";
    };
    const userId = (req as any).user!.id;

    if (!token || !platform) {
      res.status(400).json({ error: "token y platform son requeridos" });
      return;
    }

    // upsert: si el token ya existe (mismo dispositivo, distinta cuenta o re-login),
    // actualiza userId y lo reactiva.
    const [device] = await DeviceToken.upsert({
      token,
      userId,
      platform,
      isActive: true,
      lastUsedAt: new Date(),
    });

    res.status(201).json({ id: device.id, token: device.token, registered: true });
  };

  static unregister = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;
    const userId = (req as any).user!.id;
    const deleted = await DeviceToken.destroy({ where: { token, userId } });
    res.json({ removed: deleted });
  };
}

