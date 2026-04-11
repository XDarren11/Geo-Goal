'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hasColumn = async (tableName, columnName) => {
      const desc = await queryInterface.describeTable(tableName);
      return Object.prototype.hasOwnProperty.call(desc, columnName);
    };

    if (!(await hasColumn('match_events', 'matchTimestampSec'))) {
      await queryInterface.addColumn('match_events', 'matchTimestampSec', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'xStart'))) {
      await queryInterface.addColumn('match_events', 'xStart', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'yStart'))) {
      await queryInterface.addColumn('match_events', 'yStart', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'xEnd'))) {
      await queryInterface.addColumn('match_events', 'xEnd', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'yEnd'))) {
      await queryInterface.addColumn('match_events', 'yEnd', {
        type: Sequelize.FLOAT,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'outcome'))) {
      await queryInterface.addColumn('match_events', 'outcome', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!(await hasColumn('match_events', 'relatedPlayerId'))) {
      await queryInterface.addColumn('match_events', 'relatedPlayerId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      });
    }

    if (!(await hasColumn('match_events', 'source'))) {
      await queryInterface.addColumn('match_events', 'source', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'manual',
      });
    }

    if (!(await hasColumn('match_events', 'confidence'))) {
      await queryInterface.addColumn('match_events', 'confidence', {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1,
      });
    }

    if (!(await hasColumn('match_tracking_frames', 'source'))) {
      await queryInterface.addColumn('match_tracking_frames', 'source', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'manual',
      });
    }

    if (!(await hasColumn('match_tracking_frames', 'confidence'))) {
      await queryInterface.addColumn('match_tracking_frames', 'confidence', {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1,
      });
    }

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    if (!(await tableExists('player_match_stats'))) {
      await queryInterface.createTable('player_match_stats', {
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
        rating: {
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

    if (!(await hasIndex('match_events', 'idx_match_events_match_timestamp_sec'))) {
      await queryInterface.addIndex('match_events', ['matchId', 'matchTimestampSec'], {
        name: 'idx_match_events_match_timestamp_sec',
      });
    }

    if (!(await hasIndex('match_events', 'idx_match_events_player_team_type'))) {
      await queryInterface.addIndex('match_events', ['teamId', 'playerId', 'eventType'], {
        name: 'idx_match_events_player_team_type',
      });
    }

    if (!(await hasIndex('player_match_stats', 'ux_player_match_stats_unique'))) {
      await queryInterface.addIndex('player_match_stats', ['matchId', 'teamId', 'playerId'], {
        name: 'ux_player_match_stats_unique',
        unique: true,
      });
    }

    if (!(await hasIndex('player_match_stats', 'idx_player_match_stats_match'))) {
      await queryInterface.addIndex('player_match_stats', ['matchId'], {
        name: 'idx_player_match_stats_match',
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

    await dropIndexIfExists('player_match_stats', 'idx_player_match_stats_match');
    await dropIndexIfExists('player_match_stats', 'ux_player_match_stats_unique');
    await dropIndexIfExists('match_events', 'idx_match_events_player_team_type');
    await dropIndexIfExists('match_events', 'idx_match_events_match_timestamp_sec');

    try {
      await queryInterface.dropTable('player_match_stats');
    } catch {}

    const removeIfExists = async (table, col) => {
      try {
        const desc = await queryInterface.describeTable(table);
        if (Object.prototype.hasOwnProperty.call(desc, col)) {
          await queryInterface.removeColumn(table, col);
        }
      } catch {}
    };

    await removeIfExists('match_tracking_frames', 'confidence');
    await removeIfExists('match_tracking_frames', 'source');

    await removeIfExists('match_events', 'confidence');
    await removeIfExists('match_events', 'source');
    await removeIfExists('match_events', 'relatedPlayerId');
    await removeIfExists('match_events', 'outcome');
    await removeIfExists('match_events', 'yEnd');
    await removeIfExists('match_events', 'xEnd');
    await removeIfExists('match_events', 'yStart');
    await removeIfExists('match_events', 'xStart');
    await removeIfExists('match_events', 'matchTimestampSec');
  },
};
