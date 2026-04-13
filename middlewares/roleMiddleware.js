// roleMiddleware.js
// Usage: router.post("/route", auth, requireRole("doctor"), controller)

const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. Required role: ${roles.join(" or ")}`
      });
    }
    next();
  };
};

module.exports = requireRole;
