'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('news', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'leagues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      seasonId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'seasons', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      matchId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      summary: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      type: {
        type: Sequelize.ENUM('match', 'season', 'league'),
        allowNull: false,
        defaultValue: 'league',
      },
      isPublished: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      source: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      createdBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      updatedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('news', ['leagueId']);
    await queryInterface.addIndex('news', ['type']);
    await queryInterface.addIndex('news', ['isPublished']);
    await queryInterface.addIndex('news', ['createdAt']);
    await queryInterface.addIndex('news', ['source'], {
      unique: true,
      where: {
        source: { [Sequelize.Op.ne]: null },
      },
      name: 'ux_news_source_not_null',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('news', 'ux_news_source_not_null');
    await queryInterface.dropTable('news');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_news_type";');
  },
};
