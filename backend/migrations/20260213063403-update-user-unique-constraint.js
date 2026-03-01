'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Remove existing unique constraint on email if it exists
    // Note: Sequelize might have created it as 'Users_email_key' or similar. 
    // We try to remove the index/constraint.
    try {
      await queryInterface.removeConstraint('Users', 'Users_email_key');
    } catch (e) {
      console.log('Constraint Users_email_key might not exist, trying index...');
    }

    // 2. Add composite unique index on (email, role)
    await queryInterface.addIndex('Users', ['email', 'role'], {
      unique: true,
      name: 'unique_email_role'
    });
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove composite index
    await queryInterface.removeIndex('Users', 'unique_email_role');

    // 2. Re-add unique constraint on email
    // This might fail if there are duplicates now, but it's the correct "down" action
    await queryInterface.addConstraint('Users', {
      fields: ['email'],
      type: 'unique',
      name: 'Users_email_key'
    });
  }
};
