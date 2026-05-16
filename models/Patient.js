const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Patient = sequelize.define(
  "Patient",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM("male", "female"),
      allowNull: false,
    },
    nationalId: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    phone: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    address: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    medicalHistory: {
      type: DataTypes.TEXT,
      defaultValue: "",
    },
    diagnosis: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    status: {
      type: DataTypes.ENUM("Improving", "Stable", "Critical"),
      defaultValue: "Stable",
    },
    recoveryProgress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    doctorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "Users", key: "id" },
    },
  },
  {
    tableName: "Patients",
    timestamps: true,
  }
);

module.exports = Patient;