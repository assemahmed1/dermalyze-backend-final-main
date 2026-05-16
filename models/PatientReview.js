const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PatientReview = sequelize.define(
  "PatientReview",
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
    doctorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "PatientReviews",
    timestamps: true,
  }
);

module.exports = PatientReview;
