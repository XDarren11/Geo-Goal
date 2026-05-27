"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_favorites", {
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
      // 'team' | 'player' | 'coach' | 'league'
      entityType: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      entityId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      // etiqueta libre opcional (ej. "Mi equipo del corazón")
      label: {
        type: Sequelize.STRING(80),
        allowNull: true,
      },
      // para ordenar manualmente los favoritos en el menú lateral
      sortOrder: {
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

    await queryInterface.addIndex(
      "user_favorites",
      ["userId", "entityType", "entityId"],
      {
        unique: true,
        name: "user_favorites_user_entity_unique",
      }
    );

    await queryInterface.addIndex("user_favorites", ["userId"], {
      name: "user_favorites_user_idx",
    });

    await queryInterface.addIndex(
      "user_favorites",
      ["entityType", "entityId"],
      {
        name: "user_favorites_entity_idx",
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_favorites");
  },
};
