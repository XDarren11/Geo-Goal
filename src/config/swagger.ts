import swaggerJSDoc from 'swagger-jsdoc'
import { SwaggerUiOptions } from 'swagger-ui-express'

const options: swaggerJSDoc.Options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Geo-Goal API',
            version: '1.0.0',
            description: 'API REST para la gestión de ligas y equipos deportivos',
        },
        servers: [
            {
                url: process.env.BACKEND_URL || 'http://localhost:4000',
                description: 'Servidor de desarrollo'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                }
            }
        },
        security: [{
            bearerAuth: []
        }]
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts']
}

export const swaggerSpec = swaggerJSDoc(options)

export const swaggerUiOptions: SwaggerUiOptions = {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Geo-Goal API Documentation'
}

