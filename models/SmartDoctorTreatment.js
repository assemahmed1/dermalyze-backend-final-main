const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const SmartDoctorTreatment = sequelize.define(
  "SmartDoctorTreatment",
  {
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
  },
  {
    tableName: "smart_doctor_treatments",
    timestamps: true,
  }
);

SmartDoctorTreatment.removeAttribute("id");

module.exports = SmartDoctorTreatment;
