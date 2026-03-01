'use strict';

module.exports = {
    up: async (queryInterface, Sequelize) => {
        // 1. Add columns to Food table
        await queryInterface.addColumn('Food', 'donorId', {
            type: Sequelize.INTEGER,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            allowNull: true
        });

        await queryInterface.addColumn('Food', 'status', {
            type: Sequelize.STRING,
            defaultValue: 'available',
            allowNull: false
        });

        await queryInterface.addColumn('Food', 'location', {
            type: Sequelize.STRING,
            allowNull: true // Will be populated from donor's location
        });

        // 2. Create Reviews table
        await queryInterface.createTable('Reviews', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            reviewerId: {
                type: Sequelize.INTEGER,
                references: { model: 'Users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                allowNull: false
            },
            targetId: { // The donor being reviewed
                type: Sequelize.INTEGER,
                references: { model: 'Users', key: 'id' },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE',
                allowNull: false
            },
            rating: {
                type: Sequelize.INTEGER,
                allowNull: false,
                validate: { min: 1, max: 5 }
            },
            comment: {
                type: Sequelize.TEXT,
                allowNull: true
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

        // 3. Add 'expired' logic index if needed (skipping for now, simple query is fine)
    },

    down: async (queryInterface, Sequelize) => {
        await queryInterface.removeColumn('Food', 'donorId');
        await queryInterface.removeColumn('Food', 'status');
        await queryInterface.removeColumn('Food', 'location');
        await queryInterface.dropTable('Reviews');
    }
};
