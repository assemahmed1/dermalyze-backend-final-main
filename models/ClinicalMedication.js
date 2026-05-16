const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const ClinicalMedication = sequelize.define(
  "ClinicalMedication",
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
    category: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Stored as JSON array since these are simple string lists
    uses: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    sideEffects: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    dosage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    tableName: "ClinicalMedications",
    timestamps: true,
  }
);

module.exports = ClinicalMedication;
