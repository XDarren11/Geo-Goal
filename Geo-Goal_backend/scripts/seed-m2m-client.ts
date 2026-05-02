import dotenv from "dotenv";
import crypto from "crypto";
import { connectDB } from "../src/config/db";
import { Client } from "../src/models/Client";
import { hashPassword } from "../src/utils/auth";

dotenv.config();

async function seed() {
  await connectDB();

  const clientId = process.env.M2M_CLIENT_ID || crypto.randomUUID();
  const plainSecret = process.env.M2M_CLIENT_SECRET || crypto.randomBytes(32).toString("hex");
  const hashedSecret = await hashPassword(plainSecret);

  const [client, created] = await Client.findOrCreate({
    where: { clientId },
    defaults: {
      clientId,
      clientSecret: hashedSecret,
      name: process.env.M2M_CLIENT_NAME || "AI Service Client",
      active: true,
      permissions: ["*"],
    },
  });

  if (!created) {
    await client.update({
      clientSecret: hashedSecret,
      active: true,
      permissions: ["*"],
    });
  }

  console.log("\n=== M2M Client Credentials ===");
  console.log(`client_id:     ${clientId}`);
  console.log(`client_secret: ${plainSecret}`);
  console.log(`name:          ${client.name}`);
  console.log(`active:        ${client.active}`);
  console.log(`permissions:   ${JSON.stringify(client.permissions)}`);
  console.log("==============================\n");
  console.log("Guarda el client_secret — solo se muestra una vez.\n");
  console.log('Usa:\n  curl -X POST http://localhost:4000/api/auth/oauth/token \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log(`    -d '{"grant_type":"client_credentials","client_id":"${clientId}","client_secret":"${plainSecret}"}'`);
  console.log();

  process.exit(0);
}

seed().catch((err) => {
  console.error("Error seeding M2M client:", err);
  process.exit(1);
});
