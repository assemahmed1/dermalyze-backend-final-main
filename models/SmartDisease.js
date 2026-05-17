const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartDisease = sequelize.define(
  "SmartDisease",
  {
    disease_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    symptoms: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "smart_diseases",
    timestamps: true,
  }
);

module.exports = SmartDisease;
