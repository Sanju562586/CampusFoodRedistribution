'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class PendingUser extends Model {
        static associate(models) {
            // define association here
        }
    }
    PendingUser.init({
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        college: DataTypes.STRING,
        roll_number: DataTypes.STRING,
        location: DataTypes.STRING,
        role: {
            type: DataTypes.STRING,
            defaultValue: 'student'
        },
        verification_token: DataTypes.STRING,
        verification_expires: DataTypes.DATE
    }, {
        sequelize,
        modelName: 'PendingUser',
    });
    return PendingUser;
};
