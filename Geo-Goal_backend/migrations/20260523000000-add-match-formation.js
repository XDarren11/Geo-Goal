"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("match_details", "homeFormation", {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("match_details", "awayFormation", {
      type: Sequelize.STRING(10),
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("match_details", "homeFormation");
    await queryInterface.removeColumn("match_details", "awayFormation");
  },
};
