const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Message = sequelize.define(
  "Message",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    senderId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    receiverId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: { model: "Users", key: "id" },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM("text", "image", "audio", "file"),
      defaultValue: "text",
      allowNull: false,
    },
    mediaUrl: {
      type: DataTypes.STRING,
      defaultValue: null,
      allowNull: true,
    },
    durationMs: {
      type: DataTypes.INTEGER,
      defaultValue: null,
      allowNull: true,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    status: {
      type: DataTypes.ENUM("sent", "delivered", "read"),
      defaultValue: "sent",
    },
    reaction: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "Messages",
    timestamps: true,
    indexes: [
      { fields: ["senderId", "receiverId"] },
      { fields: ["receiverId", "isRead"] },
      { fields: ["createdAt"] },
    ],
  }
);

module.exports = Message;
