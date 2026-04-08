'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'league_invitations';

    const tableExists = async () => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const hasIndex = async (indexName) => {
      const indexes = await queryInterface.showIndex(tableName);
      return indexes.some((idx) => idx.name === indexName);
    };

    if (!(await tableExists())) {
      await queryInterface.createTable(tableName, {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        code: {
          type: Sequelize.STRING,
          unique: true,
          allowNull: false,
        },
        leagueId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'leagues',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: true,
        },
        usesCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0,
          allowNull: false,
        },
        maxUses: {
          type: Sequelize.INTEGER,
          defaultValue: 100,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
        },
      });
    }

    if (!(await hasIndex('idx_league_invitations_league_id'))) {
      await queryInterface.addIndex(tableName, ['leagueId'], {
        name: 'idx_league_invitations_league_id',
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('league_invitations');
  },
};
