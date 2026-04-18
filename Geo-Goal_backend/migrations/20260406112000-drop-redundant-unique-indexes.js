'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN (
          SELECT con.conname AS constraint_name
          FROM pg_constraint con
          JOIN pg_class t ON t.oid = con.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          JOIN LATERAL (
            SELECT array_agg(a.attname ORDER BY ord) AS cols
            FROM unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = k.attnum
          ) cols ON TRUE
          WHERE n.nspname = 'public'
            AND t.relname = 'league_admins'
            AND con.contype = 'u'
            AND cols.cols = ARRAY['leagueId', 'userId']::name[]
            AND con.conname <> 'ux_league_admins_league_user'
        ) LOOP
          EXECUTE format('ALTER TABLE "public"."league_admins" DROP CONSTRAINT IF EXISTS %I', r.constraint_name);
        END LOOP;

        FOR r IN (
          SELECT indexname
          FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = 'league_admins'
            AND indexdef LIKE 'CREATE UNIQUE INDEX%'
            AND indexdef NOT LIKE '%WHERE%'
            AND indexdef LIKE '%("leagueId", "userId")%'
            AND indexname <> 'ux_league_admins_league_user'
        ) LOOP
          EXECUTE format('DROP INDEX IF EXISTS "public".%I', r.indexname);
        END LOOP;
      END $$;
    `);
  },

  async down() {
    // No-op: solo limpieza de índices redundantes
  },
};
