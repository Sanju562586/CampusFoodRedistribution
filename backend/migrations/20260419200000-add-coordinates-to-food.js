'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('Foods', 'latitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
    await queryInterface.addColumn('Foods', 'longitude', {
      type: Sequelize.FLOAT,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('Foods', 'latitude');
    await queryInterface.removeColumn('Foods', 'longitude');
  },
};
