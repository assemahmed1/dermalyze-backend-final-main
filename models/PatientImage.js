const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PatientImage = sequelize.define(
  "PatientImage",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    patientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "Patients", key: "id" },
    },
    url: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
  },
  {
    tableName: "PatientImages",
    timestamps: true,
  }
);

module.exports = PatientImage;
