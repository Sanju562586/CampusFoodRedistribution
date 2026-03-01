'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Review extends Model {
        static associate(models) {
            Review.belongsTo(models.User, { as: 'reviewer', foreignKey: 'reviewerId' });
            Review.belongsTo(models.User, { as: 'target', foreignKey: 'targetId' });
        }
    }
    Review.init({
        reviewerId: DataTypes.INTEGER,
        targetId: DataTypes.INTEGER,
        rating: {
            type: DataTypes.INTEGER,
            validate: { min: 1, max: 5 }
        },
        comment: DataTypes.TEXT
    }, {
        sequelize,
        modelName: 'Review',
    });
    return Review;
};
