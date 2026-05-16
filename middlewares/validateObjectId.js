/**
 * Middleware to validate numeric IDs in request parameters.
 * With MySQL/Sequelize, IDs are integers, not MongoDB ObjectIds.
 * @param {...string} params - The names of the parameters to validate
 */
const validateObjectId = (...params) => {
  return (req, res, next) => {
    for (const param of params) {
      const id = req.params[param];
      if (id && (isNaN(id) || parseInt(id, 10) <= 0)) {
        return res.status(400).json({
          message: `Invalid ID format for parameter: ${param}`,
        });
      }
    }
    next();
  };
};

module.exports = validateObjectId;
