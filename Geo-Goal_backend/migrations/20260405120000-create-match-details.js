'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'match_details';

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
        unique: true,
        references: {
          model: 'matches',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      kickoffTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      durationMinutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 90,
      },
      endTime: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      matchDay: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      fieldId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'fields',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      homeCoachId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      awayCoachId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      homeStartingXI: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      awayStartingXI: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      homeBench: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      awayBench: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      referee: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      weather: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      attendance: {
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
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
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

    if (!(await hasIndex('idx_match_details_field_id'))) {
      await queryInterface.addIndex(tableName, ['fieldId'], { name: 'idx_match_details_field_id' });
    }
    if (!(await hasIndex('idx_match_details_home_coach_id'))) {
      await queryInterface.addIndex(tableName, ['homeCoachId'], { name: 'idx_match_details_home_coach_id' });
    }
    if (!(await hasIndex('idx_match_details_away_coach_id'))) {
      await queryInterface.addIndex(tableName, ['awayCoachId'], { name: 'idx_match_details_away_coach_id' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('match_details');
  },
};
