import swaggerUi from "swagger-ui-express";
import type { Express } from "express";
import { openApiSpec } from "./openapi";

export function setupSwagger(app: Express): void {
  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "Geo-Goal API Docs",
    })
  );
}
