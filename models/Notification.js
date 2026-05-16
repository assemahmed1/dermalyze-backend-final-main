const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    doctorId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("new_patient", "analysis_done", "appointment", "system"),
      defaultValue: "system",
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    patientId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "Patients", key: "id" },
    },
  },
  {
    tableName: "Notifications",
    timestamps: true,
    indexes: [{ fields: ["doctorId"] }],
  }
);

module.exports = Notification;
