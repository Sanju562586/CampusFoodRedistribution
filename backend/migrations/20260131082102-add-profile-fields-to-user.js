'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Users', 'name', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'college', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'roll_number', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Users', 'location', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Users', 'name');
    await queryInterface.removeColumn('Users', 'college');
    await queryInterface.removeColumn('Users', 'roll_number');
    await queryInterface.removeColumn('Users', 'location');
  }
};
