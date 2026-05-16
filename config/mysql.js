const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST,
    port: parseInt(process.env.MYSQL_PORT, 10) || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === "development" ? console.log : false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    dialectOptions: {
      connectTimeout: 10000,
    },
  }
);

// Test connection on import
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ MySQL connection established successfully.");
  })
  .catch((err) => {
    console.error("❌ Unable to connect to MySQL:", err.message);
  });

module.exports = sequelize;
