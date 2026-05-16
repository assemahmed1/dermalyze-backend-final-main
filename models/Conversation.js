const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Conversation = sequelize.define(
  "Conversation",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    lastMessageId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "Messages", key: "id" },
    },
  },
  {
    tableName: "Conversations",
    timestamps: true,
  }
);

module.exports = Conversation;
