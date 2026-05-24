"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("match_analysis_jobs", "identityMap", {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: "tracker_id (string) → userId (number) — asignado por admin en el paso de preview",
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("match_analysis_jobs", "identityMap");
  },
};

