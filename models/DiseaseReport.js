const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const DiseaseReport = sequelize.define(
  "DiseaseReport",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    diseaseId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "Diseases",
        key: "id",
      },
    },
    patientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: "Patients",
        key: "id",
      },
    },
    symptoms: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    sideEffects: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    improvementSigns: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    tableName: "Disease_Reports",
    timestamps: true,
  }
);

module.exports = DiseaseReport;
