'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Reservation extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      Reservation.belongsTo(models.User, { foreignKey: 'userId' });
      Reservation.belongsTo(models.Food, { foreignKey: 'foodId' });
    }
  }
  Reservation.init({
    userId: DataTypes.INTEGER,
    foodId: DataTypes.INTEGER,
    quantity: DataTypes.INTEGER,
    reservation_code: DataTypes.STRING,
    status: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'Reservation',
  });
  return Reservation;
};