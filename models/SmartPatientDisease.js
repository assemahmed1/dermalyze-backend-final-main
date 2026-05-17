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
      references: {
        model: "smart_diseases",
        key: "disease_id",
      },
    },
  },
  {
    tableName: "smart_patient_diseases",
    timestamps: true,
  }
);

// Define complex primary key for composite relationships if needed
SmartPatientDisease.removeAttribute("id");

module.exports = SmartPatientDisease;
