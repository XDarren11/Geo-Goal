import { Client } from "../models/Client";
import { checkPassword } from "../utils/auth";
import { AppError } from "../types/errors";

export class ClientService {
  static async validateClient(clientId: string, clientSecret: string): Promise<Client> {
    const client = await Client.findOne({ where: { clientId } });
    if (!client) {
      throw new AppError(401, "Credenciales de cliente inválidas");
    }

    if (!client.active) {
      throw new AppError(403, "Cliente inactivo");
    }

    const isValid = await checkPassword(clientSecret, client.clientSecret);
    if (!isValid) {
      throw new AppError(401, "Credenciales de cliente inválidas");
    }

    return client;
  }

  static async findByClientId(clientId: string): Promise<Client | null> {
    return Client.findOne({ where: { clientId } });
  }
}
