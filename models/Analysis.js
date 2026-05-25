const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Analysis = sequelize.define(
  "Analysis",
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
    imageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    diagnosisLabel: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Human-readable diagnosis label from local AI model"
    },
    confidenceScore: {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: "AI confidence score (0.0–1.0)"
    },
    recommendation: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "AI-generated treatment recommendation"
    },
    stage: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    severity: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    improvement: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("processing", "completed", "failed"),
      defaultValue: "processing",
      allowNull: false,
    },
  },
  {
    tableName: "Analyses",
    timestamps: true,
    indexes: [
      { fields: ["patientId", "createdAt"] },
      { fields: ["doctorId"] },
    ],
  }
);

module.exports = Analysis;