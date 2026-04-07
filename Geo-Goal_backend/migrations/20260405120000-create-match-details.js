'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('match_details', {
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

    await queryInterface.addIndex('match_details', ['matchId']);
    await queryInterface.addIndex('match_details', ['fieldId']);
    await queryInterface.addIndex('match_details', ['homeCoachId']);
    await queryInterface.addIndex('match_details', ['awayCoachId']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('match_details');
  },
};
