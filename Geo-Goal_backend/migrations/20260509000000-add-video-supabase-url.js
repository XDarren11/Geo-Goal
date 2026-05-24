'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'match_analysis_jobs';

    const tableInfo = await queryInterface.describeTable(tableName);
    if (!tableInfo.videoSupabaseUrl) {
      await queryInterface.addColumn(tableName, 'videoSupabaseUrl', {
        type: Sequelize.STRING(2048),
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableName = 'match_analysis_jobs';

    const tableInfo = await queryInterface.describeTable(tableName);
    if (tableInfo.videoSupabaseUrl) {
      await queryInterface.removeColumn(tableName, 'videoSupabaseUrl');
    }
  }
};
