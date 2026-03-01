'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Users', 'mobile_number');
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.addColumn('Users', 'mobile_number', {
            type: Sequelize.STRING,
            allowNull: true
        });
    }
};
