const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartDoctor = sequelize.define(
  "SmartDoctor",
  {
    doctor_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    specialization: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    experience_years: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "smart_doctors",
    timestamps: true,
  }
);

module.exports = SmartDoctor;
