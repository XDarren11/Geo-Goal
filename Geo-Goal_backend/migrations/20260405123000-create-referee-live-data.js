'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('match_referee_assignments', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      matchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'leagues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      refereeUserId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      assignedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'assigned',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addConstraint('match_referee_assignments', {
      fields: ['matchId', 'refereeUserId'],
      type: 'unique',
      name: 'ux_match_referee_assignments_match_referee',
    });

    await queryInterface.addIndex('match_referee_assignments', ['refereeUserId']);
    await queryInterface.addIndex('match_referee_assignments', ['leagueId']);

    await queryInterface.createTable('match_events', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      matchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'leagues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      teamId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'teams', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      playerId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      eventType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      minute: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      extraMinute: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      recordedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('match_events', ['matchId']);
    await queryInterface.addIndex('match_events', ['leagueId']);
    await queryInterface.addIndex('match_events', ['eventType']);
    await queryInterface.addIndex('match_events', ['minute']);

    await queryInterface.createTable('match_tracking_frames', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      matchId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'matches', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      leagueId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'leagues', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      timestampMs: {
        type: Sequelize.BIGINT,
        allowNull: false,
      },
      period: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      ballX: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      ballY: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      ballZ: {
        type: Sequelize.FLOAT,
        allowNull: true,
      },
      players: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: [],
      },
      recordedBy: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
    });

    await queryInterface.addIndex('match_tracking_frames', ['matchId']);
    await queryInterface.addIndex('match_tracking_frames', ['leagueId']);
    await queryInterface.addIndex('match_tracking_frames', ['timestampMs']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('match_tracking_frames');
    await queryInterface.dropTable('match_events');
    await queryInterface.dropTable('match_referee_assignments');
  },
};
