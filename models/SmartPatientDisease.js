const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartPatientDisease = sequelize.define(
  "SmartPatientDisease",
  {
    patient_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: "smart_patients",
        key: "patient_id",
      },
    },
    disease_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      // Now references the unified Diseases table instead of smart_diseases
      references: {
        model: "Diseases",
        key: "id",
      },
    },
  },
  {
    tableName: "smart_patient_diseases",
    timestamps: true,
  }
);

// Composite PK — no auto-increment id
SmartPatientDisease.removeAttribute("id");

module.exports = SmartPatientDisease;
