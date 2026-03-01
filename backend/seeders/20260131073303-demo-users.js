require('dotenv').config();
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.bulkInsert('Users', [{
      email: process.env.ADMIN_EMAIL || 'admin@campusfood.com',
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10),
      role: 'admin',
      name: 'Campus Admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }]);
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', null, {});
  }
};
