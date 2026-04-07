'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // --- league_admins cleanup ---
    await queryInterface.sequelize.query(`
      DELETE FROM "league_admins" la
      USING "league_admins" dup
      WHERE la.id > dup.id
        AND la."leagueId" = dup."leagueId"
        AND la."userId" = dup."userId";
    `);

    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "leagueId"
                 ORDER BY id ASC
               ) AS rn
        FROM "league_admins"
        WHERE "leagueRole" = 'principal'
      )
      UPDATE "league_admins" la
      SET "leagueRole" = 'assistant',
          "updatedAt" = NOW()
      FROM ranked r
      WHERE la.id = r.id
        AND r.rn > 1;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_league_admins_league_user
      ON "league_admins" ("leagueId", "userId");
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_league_admins_one_principal
      ON "league_admins" ("leagueId")
      WHERE "leagueRole" = 'principal';
    `);

    // --- seasons cleanup ---
    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "leagueId"
                 ORDER BY "updatedAt" DESC, id DESC
               ) AS rn
        FROM "seasons"
        WHERE status = 'active'
      )
      UPDATE "seasons" s
      SET status = 'draft',
          "updatedAt" = NOW()
      FROM ranked r
      WHERE s.id = r.id
        AND r.rn > 1;
    `);

    await queryInterface.sequelize.query(`
      WITH ranked AS (
        SELECT id,
               ROW_NUMBER() OVER (
                 PARTITION BY "leagueId"
                 ORDER BY "updatedAt" DESC, id DESC
               ) AS rn
        FROM "seasons"
        WHERE "isCurrent" = TRUE
      )
      UPDATE "seasons" s
      SET "isCurrent" = FALSE,
          "updatedAt" = NOW()
      FROM ranked r
      WHERE s.id = r.id
        AND r.rn > 1;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_seasons_one_active_per_league
      ON "seasons" ("leagueId")
      WHERE status = 'active';
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_seasons_one_current_per_league
      ON "seasons" ("leagueId")
      WHERE "isCurrent" = TRUE;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS ix_seasons_league_status
      ON "seasons" ("leagueId", status);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "ix_seasons_league_status";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "ux_seasons_one_current_per_league";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "ux_seasons_one_active_per_league";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "ux_league_admins_one_principal";');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS "ux_league_admins_league_user";');
  },
};
