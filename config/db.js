const { Sequelize } = require("sequelize");

// Railway provides MYSQL_URL (public) and/or MYSQL_PUBLIC_URL.
// Also support individual MYSQL_* / MYSQLHOST etc. variables.
const connectionUrl =
  process.env.MYSQL_URL ||
  process.env.MYSQL_PUBLIC_URL ||
  process.env.DATABASE_URL;

let sequelize;

if (connectionUrl) {
  // Use full connection string (preferred on Railway)
  console.log("📦 Connecting to MySQL via connection URL...");
  sequelize = new Sequelize(connectionUrl, {
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
  });
} else {
  // Fallback: individual env vars (support both MYSQL_HOST and MYSQLHOST formats)
  const host = process.env.MYSQL_HOST || process.env.MYSQLHOST || "localhost";
  const port = parseInt(process.env.MYSQL_PORT || process.env.MYSQLPORT || "3306", 10);
  const user = process.env.MYSQL_USER || process.env.MYSQLUSER || "root";
  const password = process.env.MYSQL_PASSWORD || process.env.MYSQLPASSWORD || "";
  const database = process.env.MYSQL_DATABASE || process.env.MYSQLDATABASE || "dermalyze";

  console.log(`📦 Connecting to MySQL at ${host}:${port}/${database}...`);
  sequelize = new Sequelize(database, user, password, {
    host,
    port,
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
  });
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL connection established successfully.");
  } catch (error) {
    console.error("❌ Unable to connect to MySQL:", error.message);
    process.exit(1);
  }
};

module.exports = { connectDB, sequelize };