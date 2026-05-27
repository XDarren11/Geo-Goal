"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("weekly_awards", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "leagues", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      weekStart: { type: Sequelize.DATEONLY, allowNull: false },
      weekEnd: { type: Sequelize.DATEONLY, allowNull: false },
      playerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      teamId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "teams", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      avgRating: { type: Sequelize.FLOAT, allowNull: false },
      matchesInWeek: { type: Sequelize.INTEGER, allowNull: false },
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

    await queryInterface.addIndex("weekly_awards", ["leagueId", "weekStart"], {
      unique: true,
      name: "weekly_awards_league_week_unique",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("weekly_awards");
  },
};

