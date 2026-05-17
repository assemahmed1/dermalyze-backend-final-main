const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartImprovementRate = sequelize.define(
  "SmartImprovementRate",
  {
    rate_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    patient_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "smart_patients",
        key: "patient_id",
      },
    },
    doctor_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "smart_doctors",
        key: "doctor_id",
      },
    },
    treatment_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "smart_treatments",
        key: "treatment_id",
      },
    },
    rate: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 5,
      },
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
  },
  {
    tableName: "smart_improvement_rates",
    timestamps: true,
  }
);

module.exports = SmartImprovementRate;
