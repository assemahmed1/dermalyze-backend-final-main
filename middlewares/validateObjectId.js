const mongoose = require("mongoose");

/**
 * Middleware to validate MongoDB ObjectIds in request parameters
 * @param {...string} params - The names of the parameters to validate
 */
const validateObjectId = (...params) => {
  return (req, res, next) => {
    for (const param of params) {
      const id = req.params[param];
      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: `Invalid ID format for parameter: ${param}`,
        });
      }
    }
    next();
  };
};

module.exports = validateObjectId;
