// errorHandler.js — Global Error Handler
// Must be placed last in server.js middlewares

const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Mongoose duplicate key error (e.g. duplicate email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      message: `${field} already exists`
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      message: "Validation error",
      errors: messages
    });
  }

  // Mongoose invalid ObjectId
  if (err.name === "CastError") {
    return res.status(400).json({
      message: `Invalid ID format`
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
