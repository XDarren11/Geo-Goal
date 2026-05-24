"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("matches", "type", {
      type: Sequelize.ENUM("league", "friendly"),
      allowNull: false,
      defaultValue: "league",
    });

    await queryInterface.changeColumn("matches", "leagueId", {
      type: Sequelize.INTEGER,
      allowNull: true,
    });

    await queryInterface.addIndex("matches", ["type"]);
    await queryInterface.addIndex("matches", ["type", "leagueId"]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex("matches", ["type", "leagueId"]);
    await queryInterface.removeIndex("matches", ["type"]);

    await queryInterface.changeColumn("matches", "leagueId", {
      type: Sequelize.INTEGER,
      allowNull: false,
    });

    await queryInterface.removeColumn("matches", "type");
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_matches_type";');
  },
};
