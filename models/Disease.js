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
      allowNull: true,
      defaultValue: "",
    },
    category: {
      type: DataTypes.ENUM(
        "Inflammatory",
        "Autoimmune",
        "Fungal",
        "Bacterial",
        "Viral",
        "Parasitic",
        "Neoplastic",
        "Other"
      ),
      allowNull: true,
      defaultValue: "Other",
    },
    severity: {
      type: DataTypes.ENUM(
        "Mild",
        "Mild to Moderate",
        "Moderate",
        "Moderate to Severe",
        "Severe"
      ),
      allowNull: true,
      defaultValue: "Moderate",
    },
    generalInfo: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    symptoms: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    visualPatterns: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: "",
    },
    treatments: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    imageUrl: {
      type: DataTypes.STRING(1024),
      allowNull: true,
      defaultValue: null,
    },
  },
  {
    tableName: "Diseases",
    timestamps: true,
    indexes: [
      { fields: ["name"] },
      { fields: ["scientificName"] },
      { fields: ["category"] },
    ],
  }
);

module.exports = Disease;
