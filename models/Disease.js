const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const Disease = sequelize.define(
  "Disease",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    scientificName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    generalInfo: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    tableName: "Diseases",
    timestamps: true,
    indexes: [
      { fields: ["name"] },
      { fields: ["scientificName"] },
    ],
  }
);

module.exports = Disease;
