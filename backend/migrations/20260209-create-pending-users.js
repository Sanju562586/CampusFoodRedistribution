'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('PendingUsers', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            password: {
                type: Sequelize.STRING,
                allowNull: false
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false
            },
            college: {
                type: Sequelize.STRING
            },
            roll_number: {
                type: Sequelize.STRING
            },
            location: {
                type: Sequelize.STRING
            },
            role: {
                type: Sequelize.STRING,
                defaultValue: 'student'
            },
            verification_token: {
                type: Sequelize.STRING
            },
            verification_expires: {
                type: Sequelize.DATE
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('PendingUsers');
    }
};
