import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Geo-Goal API',
      version: '1.0.0',
      description: 'Documentación de la API Geo-Goal',
    },
    servers: [
      {
        //ajustar direccion
        url: 'http://localhost:4000',
      },
    ],
  },
  apis: ['./src/controllers/*.ts'], // Rutas de los controladores
};

const swaggerSpec = swaggerJsdoc(options);

export function setupSwagger(app: Express) {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

