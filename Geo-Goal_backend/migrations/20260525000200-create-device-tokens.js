"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("device_tokens", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "users", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      token: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      platform: {
        type: Sequelize.ENUM("ios", "android", "web"),
        allowNull: false,
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      lastUsedAt: {
        type: Sequelize.DATE,
        allowNull: true,
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

    await queryInterface.addIndex("device_tokens", ["token"], {
      unique: true,
      name: "device_tokens_token_unique",
    });

    await queryInterface.addIndex("device_tokens", ["userId"], {
      name: "device_tokens_user_idx",
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("device_tokens");
  },
};

