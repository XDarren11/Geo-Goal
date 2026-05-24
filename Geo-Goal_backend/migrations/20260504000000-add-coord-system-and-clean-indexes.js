'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add coordSystem column (idempotent)
    const table = await queryInterface.describeTable('match_tracking_frames');
    if (!table.coordSystem) {
      await queryInterface.addColumn('match_tracking_frames', 'coordSystem', {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: 'normalized',
      });
    }

    // 2. Remove duplicate indexes (idempotent — kept the idx_* prefixed ones)
    await queryInterface.removeIndex('match_tracking_frames', 'match_tracking_frames_match_id').catch(() => {});
    await queryInterface.removeIndex('match_tracking_frames', 'match_tracking_frames_league_id').catch(() => {});
    await queryInterface.removeIndex('match_tracking_frames', 'match_tracking_frames_timestamp_ms').catch(() => {});
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('match_tracking_frames', 'coordSystem');
  }
};
