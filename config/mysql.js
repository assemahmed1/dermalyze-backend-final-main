// config/mysql.js — Re-exports from db.js for backwards compatibility
const { sequelize } = require("./db");
module.exports = sequelize;
