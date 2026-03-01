'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('Food');
        if (!tableInfo.price) {
            await queryInterface.addColumn('Food', 'price', {
                type: Sequelize.FLOAT,
                defaultValue: 0.0,
                allowNull: false
            });
        }
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeColumn('Food', 'price');
    }
};
