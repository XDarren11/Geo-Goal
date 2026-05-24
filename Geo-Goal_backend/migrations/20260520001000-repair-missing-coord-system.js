'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('match_tracking_frames');
    if (!table.coordSystem) {
      await queryInterface.addColumn('match_tracking_frames', 'coordSystem', {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'normalized',
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('match_tracking_frames');
    if (table.coordSystem) {
      await queryInterface.removeColumn('match_tracking_frames', 'coordSystem');
    }
  }
};
