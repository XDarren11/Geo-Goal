'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // 1) users.role: unificar default + normalizar valor legado "jugador"
    await queryInterface.sequelize.query(`
      UPDATE "users"
      SET "role" = 'player'
      WHERE LOWER(TRIM("role")) = 'jugador';
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET DEFAULT 'player';
    `);

    // 2) league_admins: remover únicos incorrectos por columna y asegurar único compuesto
    await queryInterface.sequelize.query(`
      DELETE FROM "league_admins" la
      USING "league_admins" dup
      WHERE la.id > dup.id
        AND la."leagueId" = dup."leagueId"
        AND la."userId" = dup."userId";
    `);

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
          WHERE c.contype = 'u'
            AND n.nspname = 'public'
            AND t.relname = 'league_admins'
          GROUP BY c.conname
          HAVING array_agg(a.attname ORDER BY k.ord) = ARRAY['leagueId']::name[]
              OR array_agg(a.attname ORDER BY k.ord) = ARRAY['userId']::name[]
        ) LOOP
          EXECUTE format('ALTER TABLE "public"."league_admins" DROP CONSTRAINT IF EXISTS %I', r.conname);
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'league_admins'
            AND indexdef LIKE 'CREATE UNIQUE INDEX%'
            AND indexdef NOT LIKE '%WHERE%'
            AND (
              indexdef LIKE '%("leagueId")%'
              OR indexdef LIKE '%("userId")%'
            )
            AND indexname NOT IN ('ux_league_admins_league_user', 'ux_league_admins_one_principal')
        ) LOOP
          EXECUTE format('DROP INDEX IF EXISTS "public".%I', r.indexname);
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_league_admins_league_user
      ON "league_admins" ("leagueId", "userId");
    `);

    // 3) match_referee_assignments: un árbitro principal por partido (único por matchId)
    await queryInterface.sequelize.query(`
      DELETE FROM "match_referee_assignments" a
      USING "match_referee_assignments" b
      WHERE a."matchId" = b."matchId"
        AND a.id < b.id;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT c.conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
          JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
          WHERE c.contype = 'u'
            AND n.nspname = 'public'
            AND t.relname = 'match_referee_assignments'
          GROUP BY c.conname
          HAVING array_agg(a.attname ORDER BY k.ord) = ARRAY['matchId']::name[]
              OR array_agg(a.attname ORDER BY k.ord) = ARRAY['refereeUserId']::name[]
              OR array_agg(a.attname ORDER BY k.ord) = ARRAY['matchId', 'refereeUserId']::name[]
        ) LOOP
          EXECUTE format('ALTER TABLE "public"."match_referee_assignments" DROP CONSTRAINT IF EXISTS %I', r.conname);
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'match_referee_assignments'
            AND indexdef LIKE 'CREATE UNIQUE INDEX%'
            AND indexdef NOT LIKE '%WHERE%'
            AND (
              indexdef LIKE '%("matchId")%'
              OR indexdef LIKE '%("refereeUserId")%'
              OR indexdef LIKE '%("matchId", "refereeUserId")%'
            )
            AND indexname <> 'ux_match_referee_assignments_match'
        ) LOOP
          EXECUTE format('DROP INDEX IF EXISTS "public".%I', r.indexname);
        END LOOP;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_match_referee_assignments_match
      ON "match_referee_assignments" ("matchId");
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "ux_match_referee_assignments_match";
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_match_referee_assignments_match_referee
      ON "match_referee_assignments" ("matchId", "refereeUserId");
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "ux_league_admins_league_user";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE "users"
      ALTER COLUMN "role" SET DEFAULT 'jugador';
    `);
  },
};
