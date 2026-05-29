"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("team_elo_ratings", {
      teamId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      rating: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 1500,
      },
      gamesPlayed: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastMatchId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      ratingHistory: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
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
    await queryInterface.dropTable("team_elo_ratings");
  },
};

