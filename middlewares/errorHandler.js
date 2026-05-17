// errorHandler.js — Global Error Handler
// Must be placed last in server.js middlewares

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  let status = err.status || 500;
  let message = err.message || "Internal server error";

  // Sequelize unique constraint error (e.g. duplicate email)
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "field";
    status = 400;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Sequelize validation error
  else if (err.name === "SequelizeValidationError") {
    status = 400;
    message = err.errors.map((e) => e.message).join(", ");
  }

  // Sequelize database error (e.g. bad column, syntax) — never expose raw DB errors
  else if (err.name === "SequelizeDatabaseError") {
    status = 400;
    message = "Database service encountered an error";
  }

  // JWT errors
  else if (err.name === "JsonWebTokenError") {
    status = 401;
    message = "Invalid authentication token";
  }

  else if (err.name === "TokenExpiredError") {
    status = 401;
    message = "Authentication token has expired";
  }

  res.status(status).json({
    success: false,
    message
  });
};

module.exports = errorHandler;
