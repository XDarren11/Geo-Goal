/**
 * Variables de entorno requeridas
 */
const requiredEnvVars = [
    'DATABASE_URL',
    'FRONTEND_URL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD'
] as const;

/**
 * Interfaz para las variables de entorno
 */
export interface EnvVariables {
    DATABASE_URL: string;
    FRONTEND_URL: string;
    BACKEND_URL?: string;
    PORT?: string;
    NODE_ENV?: 'development' | 'production' | 'test';
    SMTP_HOST: string;
    SMTP_PORT: string;
    SMTP_USER: string;
    SMTP_PASSWORD: string;
    JWT_SECRET?: string;
}

/**
 * Valida que todas las variables de entorno requeridas estén presentes
 */
export const validateEnvVariables = (): void => {
    const missingVars: string[] = [];

    for (const varName of requiredEnvVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }

    if (missingVars.length > 0) {
        throw new Error(
            `❌ Faltan las siguientes variables de entorno requeridas:\n${missingVars.map(v => `  - ${v}`).join('\n')}\n\nPor favor, configura estas variables en tu archivo .env`
        );
    }

    console.log('✅ Variables de entorno validadas correctamente');
};

/**
 * Obtiene las variables de entorno tipadas
 */
export const getEnvVariables = (): EnvVariables => {
    return {
        DATABASE_URL: process.env.DATABASE_URL!,
        FRONTEND_URL: process.env.FRONTEND_URL!,
        BACKEND_URL: process.env.BACKEND_URL,
        PORT: process.env.PORT || '4000',
        NODE_ENV: (process.env.NODE_ENV as EnvVariables['NODE_ENV']) || 'development',
        SMTP_HOST: process.env.SMTP_HOST!,
        SMTP_PORT: process.env.SMTP_PORT!,
        SMTP_USER: process.env.SMTP_USER!,
        SMTP_PASSWORD: process.env.SMTP_PASSWORD!,
        JWT_SECRET: process.env.JWT_SECRET || 'default-secret-change-in-production'
    };
};

