'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    if (!(await tableExists('team_match_stats'))) {
      await queryInterface.createTable('team_match_stats', {
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
        minutesPlayed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        passes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        passesCompleted: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        keyPasses: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        shots: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        shotsOnTarget: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        goals: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        assists: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        yellowCards: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        redCards: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        distanceMeters: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
        },
        avgRating: {
          type: Sequelize.FLOAT,
          allowNull: false,
          defaultValue: 0,
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

    const hasIndex = async (table, name) => {
      const indexes = await queryInterface.showIndex(table);
      return indexes.some((idx) => idx.name === name);
    };

    if (!(await hasIndex('team_match_stats', 'ux_team_match_stats_unique'))) {
      await queryInterface.addIndex('team_match_stats', ['matchId', 'teamId'], {
        name: 'ux_team_match_stats_unique',
        unique: true,
      });
    }

    if (!(await hasIndex('team_match_stats', 'idx_team_match_stats_match'))) {
      await queryInterface.addIndex('team_match_stats', ['matchId'], {
        name: 'idx_team_match_stats_match',
      });
    }

    if (!(await hasIndex('team_match_stats', 'idx_team_match_stats_team'))) {
      await queryInterface.addIndex('team_match_stats', ['teamId'], {
        name: 'idx_team_match_stats_team',
      });
    }
  },

  async down(queryInterface) {
    const dropIndexIfExists = async (table, name) => {
      const indexes = await queryInterface.showIndex(table);
      if (indexes.some((idx) => idx.name === name)) {
        await queryInterface.removeIndex(table, name);
      }
    };

    await dropIndexIfExists('team_match_stats', 'idx_team_match_stats_team');
    await dropIndexIfExists('team_match_stats', 'idx_team_match_stats_match');
    await dropIndexIfExists('team_match_stats', 'ux_team_match_stats_unique');

    try {
      await queryInterface.dropTable('team_match_stats');
    } catch {}
  },
};
