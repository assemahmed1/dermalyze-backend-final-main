const { body, validationResult } = require("express-validator");

// Validate request and return errors if any
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg }))
    });
  }
  next();
};

// Register validation rules
const registerRules = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
  body("role")
    .optional()
    .isIn(["doctor", "patient"])
    .withMessage("Role must be doctor or patient"),
  body("doctorCode")
    .if((value, { req }) => req.body.role === "patient")
    .notEmpty()
    .withMessage("Doctor code is required for patient registration")
];

// Login validation rules
const loginRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required")
];

// Create patient validation rules
const patientRules = [
  body("name").trim().notEmpty().withMessage("Patient name is required"),
  body("age")
    .isInt({ min: 0, max: 120 })
    .withMessage("Age must be a valid number"),
  body("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female")
];

// Forgot password rules
const forgotPasswordRules = [
  body("email").isEmail().withMessage("Valid email is required")
];

// Verify OTP rules
const verifyOTPRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("code").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits")
];

// Reset password rules
const resetPasswordRules = [
  body("email").isEmail().withMessage("Valid email is required"),
  body("code").isLength({ min: 6, max: 6 }).withMessage("OTP must be 6 digits"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters")
];

// Review validation rules
const reviewRules = [
  body("review")
    .trim()
    .notEmpty()
    .withMessage("Review text is required")
    .isLength({ min: 10, max: 1000 })
    .withMessage("Review must be between 10 and 1000 characters")
];

module.exports = {
  validate,
  registerRules,
  loginRules,
  patientRules,
  forgotPasswordRules,
  verifyOTPRules,
  resetPasswordRules,
  reviewRules
};
