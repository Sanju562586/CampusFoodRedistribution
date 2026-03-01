'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Food extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Food.hasMany(models.Reservation, { foreignKey: 'foodId' });
      Food.belongsTo(models.User, { as: 'donor', foreignKey: 'donorId' });
    }
  }
  Food.init({
    name: DataTypes.STRING,
    quantity: DataTypes.INTEGER,
    expiry_time: DataTypes.DATE,
    dining_hall: DataTypes.STRING,
    allergens: DataTypes.STRING,
    donorId: DataTypes.INTEGER,
    status: DataTypes.STRING,
    location: DataTypes.STRING,
    landmark: DataTypes.STRING,
    image_url: DataTypes.TEXT,
    price: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0
    }
  }, {
    sequelize,
    modelName: 'Food',
  });
  return Food;
};