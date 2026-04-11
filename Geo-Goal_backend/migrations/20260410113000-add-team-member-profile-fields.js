'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'team_members';

    const hasColumn = async (columnName) => {
      const def = await queryInterface.describeTable(tableName);
      return Boolean(def[columnName]);
    };

    const hasIndex = async (indexName) => {
      const indexes = await queryInterface.showIndex(tableName);
      return indexes.some((idx) => idx.name === indexName);
    };

    if (!(await hasColumn('playerName'))) {
      await queryInterface.addColumn(tableName, 'playerName', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!(await hasColumn('jerseyNumber'))) {
      await queryInterface.addColumn(tableName, 'jerseyNumber', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!(await hasColumn('preferredPosition'))) {
      await queryInterface.addColumn(tableName, 'preferredPosition', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!(await hasIndex('idx_team_members_team_jersey_unique'))) {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_team_jersey_unique
        ON "team_members" ("teamId", "jerseyNumber")
        WHERE "jerseyNumber" IS NOT NULL;
      `);
    }
  },

  async down(queryInterface) {
    const tableName = 'team_members';
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_team_members_team_jersey_unique;');

    const def = await queryInterface.describeTable(tableName);
    if (def.preferredPosition) {
      await queryInterface.removeColumn(tableName, 'preferredPosition');
    }
    if (def.jerseyNumber) {
      await queryInterface.removeColumn(tableName, 'jerseyNumber');
    }
    if (def.playerName) {
      await queryInterface.removeColumn(tableName, 'playerName');
    }
  },
};
