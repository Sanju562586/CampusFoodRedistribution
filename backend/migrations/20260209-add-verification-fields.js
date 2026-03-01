'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.addColumn('Users', 'mobile_number', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('Users', 'is_verified', {
            type: Sequelize.BOOLEAN,
            defaultValue: false
        });
        await queryInterface.addColumn('Users', 'verification_token', {
            type: Sequelize.STRING,
            allowNull: true
        });
        await queryInterface.addColumn('Users', 'verification_expires', {
            type: Sequelize.DATE,
            allowNull: true
        });
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Users', 'mobile_number');
        await queryInterface.removeColumn('Users', 'is_verified');
        await queryInterface.removeColumn('Users', 'verification_token');
        await queryInterface.removeColumn('Users', 'verification_expires');
    }
};
