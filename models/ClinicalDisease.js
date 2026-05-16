const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ClinicalDisease = sequelize.define(
  "ClinicalDisease",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Stored as JSON array since these are simple string lists
    symptoms: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    treatments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    imageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
  },
  {
    tableName: "ClinicalDiseases",
    timestamps: true,
  }
);

module.exports = ClinicalDisease;
