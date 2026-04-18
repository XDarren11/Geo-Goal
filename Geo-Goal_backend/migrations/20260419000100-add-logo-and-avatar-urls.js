'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableLeagues = await queryInterface.describeTable('leagues');
    if (!tableLeagues['logoUrl']) {
      await queryInterface.addColumn('leagues', 'logoUrl', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      });
    }

    const tableMembers = await queryInterface.describeTable('team_members');
    if (!tableMembers['avatarUrl']) {
      await queryInterface.addColumn('team_members', 'avatarUrl', {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      });
    }
  },

  async down(queryInterface) {
    const tableLeagues = await queryInterface.describeTable('leagues');
    if (tableLeagues['logoUrl']) {
      await queryInterface.removeColumn('leagues', 'logoUrl');
    }

    const tableMembers = await queryInterface.describeTable('team_members');
    if (tableMembers['avatarUrl']) {
      await queryInterface.removeColumn('team_members', 'avatarUrl');
    }
  },
};
