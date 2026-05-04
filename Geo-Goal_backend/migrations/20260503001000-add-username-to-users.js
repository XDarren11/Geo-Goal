'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableName = 'users';
    const hasColumn = async (columnName) => {
      const description = await queryInterface.describeTable(tableName);
      return Boolean(description[columnName]);
    };

    if (!(await hasColumn('username'))) {
      await queryInterface.addColumn(tableName, 'username', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const tableName = 'users';
    const description = await queryInterface.describeTable(tableName);
    if (description.username) {
      await queryInterface.removeColumn(tableName, 'username');
    }
  },
};
