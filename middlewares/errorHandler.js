// errorHandler.js — Global Error Handler
// Must be placed last in server.js middlewares

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Sequelize unique constraint error (e.g. duplicate email)
  if (err.name === "SequelizeUniqueConstraintError") {
    const field = err.errors?.[0]?.path || "field";
    return res.status(400).json({
      message: `${field} already exists`
    });
  }

  // Sequelize validation error
  if (err.name === "SequelizeValidationError") {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({
      message: "Validation error",
      errors: messages
    });
  }

  // Sequelize database error (e.g. bad column, syntax)
  if (err.name === "SequelizeDatabaseError") {
    return res.status(400).json({
      message: "Database error"
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ message: "Invalid token" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Token expired" });
  }

  // Default
  res.status(err.status || 500).json({
    message: err.message || "Internal server error"
  });
};

module.exports = errorHandler;
