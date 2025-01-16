import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";

export const tenantValidator = [
  body("name")
    .exists()
    .withMessage("Tenant name is required")
    .isString()
    .withMessage("Tenant name must be a string")
    .notEmpty()
    .withMessage("Tenant name cannot be empty"),

  body("logo").optional().isURL().withMessage("Image must be a valid URL"),

  body("color")
    .exists()
    .withMessage("Color is required")
    .isString()
    .withMessage("Color must be a string")
    .matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .withMessage("Color must be a valid hex code (e.g., #FFF or #FFFFFF)"),

  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const tenantLoginValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isLength({ min: 5 })
    .withMessage("Password must be at least 5 characters long"),

  handleValidationErrors,
];

export const tenantForgotPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const tenantResetPasswordValidator = [
  body("token")
    .exists()
    .withMessage("token is required")
    .isString()
    .withMessage("token must be a string"),

  body("password")
    .exists()
    .withMessage("password is required")
    .isString()
    .withMessage("password must be a string"),

  handleValidationErrors,
];
