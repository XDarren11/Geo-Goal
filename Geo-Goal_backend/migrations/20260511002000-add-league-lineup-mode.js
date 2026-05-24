module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableLeagues = await queryInterface.describeTable("leagues");

    if (!tableLeagues.lineupMode) {
      await queryInterface.addColumn("leagues", "lineupMode", {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 11,
      });
    }

    await queryInterface.sequelize.query(
      'UPDATE "leagues" SET "lineupMode" = 11 WHERE "lineupMode" IS NULL'
    );
  },

  down: async (queryInterface) => {
    const tableLeagues = await queryInterface.describeTable("leagues");
    if (tableLeagues.lineupMode) {
      await queryInterface.removeColumn("leagues", "lineupMode");
    }
  },
};
