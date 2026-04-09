'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'notifications';

    const tableExists = async () => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const hasIndex = async (indexName) => {
      const indexes = await queryInterface.showIndex(tableName);
      return indexes.some((idx) => idx.name === indexName);
    };

    if (!(await tableExists())) {
      await queryInterface.createTable(tableName, {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      title: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false,
      },
      payload: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      readAt: {
        type: Sequelize.DATE,
        allowNull: true,
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
    }

    if (!(await hasIndex('idx_notifications_user_id'))) {
      await queryInterface.addIndex(tableName, ['userId'], { name: 'idx_notifications_user_id' });
    }
    if (!(await hasIndex('idx_notifications_read_at'))) {
      await queryInterface.addIndex(tableName, ['readAt'], { name: 'idx_notifications_read_at' });
    }
    if (!(await hasIndex('idx_notifications_created_at'))) {
      await queryInterface.addIndex(tableName, ['createdAt'], { name: 'idx_notifications_created_at' });
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable('notifications');
  },
};
