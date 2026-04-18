require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || '';
const requiresSsl =
  process.env.DB_SSL === 'true' ||
  /sslmode=require/i.test(databaseUrl) ||
  (!/localhost|127\.0\.0\.1/i.test(databaseUrl) && databaseUrl.startsWith('postgres'));

const base = {
  url: databaseUrl,
  dialect: 'postgres',
  migrationStorageTableName: 'SequelizeMeta',
  logging: false,
  dialectOptions: requiresSsl
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : {},
};

module.exports = {
  development: base,
  test: base,
  production: base,
};
