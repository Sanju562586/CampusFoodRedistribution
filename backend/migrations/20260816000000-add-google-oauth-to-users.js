'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('Users');

    // Only add google_id if it doesn't already exist
    if (!tableDesc.google_id) {
      await queryInterface.addColumn('Users', 'google_id', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      });
    }

    // Only add avatar_url if it doesn't already exist
    if (!tableDesc.avatar_url) {
      await queryInterface.addColumn('Users', 'avatar_url', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable('Users');
    if (tableDesc.google_id) {
      await queryInterface.removeColumn('Users', 'google_id');
    }
    if (tableDesc.avatar_url) {
      await queryInterface.removeColumn('Users', 'avatar_url');
    }
  },
};
