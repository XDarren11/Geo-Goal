"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("league_prediction_models", {
      leagueId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "leagues", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      teamParams: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      homeAdvantage: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1.3,
      },
      rho: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: -0.1,
      },
      loss: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      fittedAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      matchesUsed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("NOW()"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("league_prediction_models");
  },
};

