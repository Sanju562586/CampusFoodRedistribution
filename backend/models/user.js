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
    // ── Google OAuth ─────────────────────────────────────────────────────────
    // google_id: the "sub" claim from the Google ID token — globally unique per user.
    // avatar_url: Google profile photo URL served from lh3.googleusercontent.com.
    // Both are nullable so existing email/password accounts are unaffected.
    google_id: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    avatar_url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    // ─────────────────────────────────────────────────────────────────────────
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpires: DataTypes.DATE

  }, {
    sequelize,
    modelName: 'User',
  });
  return User;
};