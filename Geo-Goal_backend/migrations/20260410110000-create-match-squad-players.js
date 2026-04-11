'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'match_squad_players';

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
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        matchId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'matches', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        teamId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'teams', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        playerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        squadRole: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: 'roster',
        },
        isAvailable: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        isCaptain: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        jerseyNumber: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        position: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        minutesPlanned: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        createdBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        updatedBy: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
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

    if (!(await hasIndex('ux_match_squad_players_match_team_player'))) {
      await queryInterface.addIndex(tableName, ['matchId', 'teamId', 'playerId'], {
        name: 'ux_match_squad_players_match_team_player',
        unique: true,
      });
    }
    if (!(await hasIndex('idx_match_squad_players_match_team'))) {
      await queryInterface.addIndex(tableName, ['matchId', 'teamId'], {
        name: 'idx_match_squad_players_match_team',
      });
    }
    if (!(await hasIndex('idx_match_squad_players_role'))) {
      await queryInterface.addIndex(tableName, ['squadRole'], {
        name: 'idx_match_squad_players_role',
      });
    }
    if (!(await hasIndex('idx_match_squad_players_player'))) {
      await queryInterface.addIndex(tableName, ['playerId'], {
        name: 'idx_match_squad_players_player',
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('match_squad_players');
  },
};
