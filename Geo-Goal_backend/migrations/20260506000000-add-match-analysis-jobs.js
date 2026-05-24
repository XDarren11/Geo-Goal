'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'match_analysis_jobs';

    let tableExists = false;
    try {
      await queryInterface.describeTable(tableName);
      tableExists = true;
    } catch (_) {
      // table does not exist
    }

    if (tableExists) return;

    await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      matchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'leagues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'uploaded',
      },
      videoPath: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      videoFilename: {
        type: Sequelize.STRING(1024),
        allowNull: true,
      },
      srcPts: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      progress: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currentStep: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      framesProcessed: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      totalFrames: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      pid: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      error: {
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
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex(tableName, ['matchId']);
    await queryInterface.addIndex(tableName, ['status']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('match_analysis_jobs');
  }
};
