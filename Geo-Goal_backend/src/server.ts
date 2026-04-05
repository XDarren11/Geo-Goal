import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import morgan from "morgan";
import { corsConfig } from "./config/cors";
import { connectDB } from "./config/db";
import { registerRoutes } from "./routes";
import { setupSwagger } from "./config/swagger";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config();

connectDB();

const app = express();

app.use(cors(corsConfig));
app.use("/uploads", express.static("public/uploads"));
app.use(morgan("dev"));
app.use(express.json());

registerRoutes(app);
setupSwagger(app);

app.use(errorHandler);

export default app;;
