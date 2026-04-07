'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const { DataTypes } = Sequelize;

    const normalizeTableName = (table) => {
      if (typeof table === 'string') {
        return table.includes('.') ? table.split('.').pop().replace(/"/g, '') : table.replace(/"/g, '');
      }

      if (table && typeof table === 'object') {
        return table.tableName || table.name || '';
      }

      return '';
    };

    const tableExists = async (tableName) => {
      const tables = await queryInterface.showAllTables();
      return tables.map(normalizeTableName).includes(tableName);
    };

    const columnExists = async (tableName, columnName) => {
      if (!(await tableExists(tableName))) return false;
      const definition = await queryInterface.describeTable(tableName);
      return Boolean(definition[columnName]);
    };

    const getFkConstraints = async (tableName) => {
      try {
        const refs = await queryInterface.getForeignKeyReferencesForTable(tableName);
        return refs.map((ref) => ref.constraintName).filter(Boolean);
      } catch (_error) {
        return [];
      }
    };

    const ensureFk = async (tableName, columnName, options) => {
      const existing = await getFkConstraints(tableName);
      if (!existing.includes(options.name)) {
        await queryInterface.addConstraint(tableName, {
          fields: [columnName],
          type: 'foreign key',
          ...options,
        });
      }
    };

    const ensureIndex = async (tableName, columnName, indexName) => {
      const indexes = await queryInterface.showIndex(tableName);
      const exists = indexes.some((idx) => idx.name === indexName);
      if (!exists) {
        await queryInterface.addIndex(tableName, [columnName], { name: indexName });
      }
    };

    if (await tableExists('matches')) {
      if (!(await columnExists('matches', 'seasonId'))) {
        await queryInterface.addColumn('matches', 'seasonId', {
          type: DataTypes.INTEGER,
          allowNull: true,
        });
      }

      await ensureFk('matches', 'seasonId', {
        name: 'fk_matches_season_id_repair',
        references: {
          table: 'seasons',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await ensureIndex('matches', 'seasonId', 'idx_matches_season_id_repair');
    }

    if (await tableExists('team_league_stats')) {
      if (!(await columnExists('team_league_stats', 'seasonId'))) {
        await queryInterface.addColumn('team_league_stats', 'seasonId', {
          type: DataTypes.INTEGER,
          allowNull: true,
        });
      }

      await ensureFk('team_league_stats', 'seasonId', {
        name: 'fk_team_league_stats_season_id_repair',
        references: {
          table: 'seasons',
          field: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });

      await ensureIndex('team_league_stats', 'seasonId', 'idx_team_league_stats_season_id_repair');
    }
  },

  async down(queryInterface) {
    try {
      await queryInterface.removeConstraint('matches', 'fk_matches_season_id_repair');
    } catch (_error) {}

    try {
      await queryInterface.removeIndex('matches', 'idx_matches_season_id_repair');
    } catch (_error) {}

    try {
      const matchesDef = await queryInterface.describeTable('matches');
      if (matchesDef.seasonId) {
        await queryInterface.removeColumn('matches', 'seasonId');
      }
    } catch (_error) {}

    try {
      await queryInterface.removeConstraint('team_league_stats', 'fk_team_league_stats_season_id_repair');
    } catch (_error) {}

    try {
      await queryInterface.removeIndex('team_league_stats', 'idx_team_league_stats_season_id_repair');
    } catch (_error) {}

    try {
      const statsDef = await queryInterface.describeTable('team_league_stats');
      if (statsDef.seasonId) {
        await queryInterface.removeColumn('team_league_stats', 'seasonId');
      }
    } catch (_error) {}
  },
};
