'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      User.hasMany(models.Reservation, { foreignKey: 'userId' });
      User.hasMany(models.Food, { as: 'donations', foreignKey: 'donorId' });
      User.hasMany(models.Review, { as: 'writtenReviews', foreignKey: 'reviewerId' });
      User.hasMany(models.Review, { as: 'receivedReviews', foreignKey: 'targetId' });
    }
  }
  User.init({
    email: DataTypes.STRING,
    password: DataTypes.STRING,
    name: DataTypes.STRING,
    college: DataTypes.STRING,
    roll_number: DataTypes.STRING,
    location: DataTypes.STRING,
    dietary_preferences: {
      type: DataTypes.STRING, // e.g., "Veg", "Non-Veg"
      defaultValue: "Non-Veg"
    },
    allergens: {
      type: DataTypes.JSON, // e.g., ["Peanuts", "Dairy"]
      defaultValue: [] // SQLite JSON support
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpires: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};