const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartTreatment = sequelize.define(
  "SmartTreatment",
  {
    treatment_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    dosage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usage: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    clinicalMedicationId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "ClinicalMedications", key: "id" },
    },
  },
  {
    tableName: "smart_treatments",
    timestamps: true,
  }
);

module.exports = SmartTreatment;
