'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leagues', 'refereeAssignmentMode', {
      type: Sequelize.ENUM('manual', 'auto'),
      allowNull: false,
      defaultValue: 'auto',
      after: 'lineupMode',
    });

    await queryInterface.addColumn('leagues', 'autoAssignWindowDays', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 7,
      after: 'refereeAssignmentMode',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('leagues', 'autoAssignWindowDays');
    await queryInterface.removeColumn('leagues', 'refereeAssignmentMode');
  },
};
