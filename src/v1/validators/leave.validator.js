import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

// Validator for adding a new Leave Type
export const leaveTypeValidator = [
  body("name")
    .exists()
    .withMessage("Leave type name is required")
    .isString()
    .withMessage("Leave type name must be a string")
    .notEmpty()
    .withMessage("Leave type name cannot be empty"),

  body("defaultBalance")
    .optional()
    .isNumeric()
    .withMessage("Default balance must be a number")
    .isInt({ min: 0 })
    .withMessage("Default balance must be a positive integer"),

  handleValidationErrors,
];

// Validator for updating an existing Leave Type
export const leaveTypeUpdateValidator = [
  body("name")
    .optional()
    .isString()
    .withMessage("Leave type name must be a string")
    .notEmpty()
    .withMessage("Leave type name cannot be empty"),

  body("defaultBalance")
    .optional()
    .isNumeric()
    .withMessage("Default balance must be a number")
    .isInt({ min: 0 })
    .withMessage("Default balance must be a positive integer"),

  handleValidationErrors,
];

// Validator for requesting a new leave
export const leaveRequestValidator = [
  body("leaveTypeId")
    .exists()
    .withMessage("Leave type ID is required")
    .isMongoId()
    .withMessage("Invalid Leave type ID"),

  body("startDate")
    .exists()
    .withMessage("startDate is required")
    .isDate()
    .withMessage("Invalid startDate"),

  body("endDate")
    .exists()
    .withMessage("endDate is required")
    .isDate()
    .withMessage("Invalid endDate")
    .custom((value, { req }) => {
      if (new Date(value) < new Date(req.body.from)) {
        throw ApiError.badRequest("To date must be after the From date");
      }
      return true;
    }),

  body("daysTaken")
    .exists()
    .withMessage("daysTaken is required")
    .isNumeric()
    .withMessage("daysTaken must be a number")
    .isInt({ min: 0 })
    .withMessage("daysTaken must be a positive integer"),

  body("description")
    .exists()
    .withMessage("description is required")
    .isString()
    .withMessage("description must be a string"),

  handleValidationErrors,
];

// Validator for updating a leave request (approve, reject, etc.)
export const leaveRequestUpdateValidator = [
  body("status")
    .exists()
    .withMessage("Status is required")
    .isIn(["pending", "approved", "rejected"])
    .withMessage("Status must be one of: pending, approved, rejected"),

  handleValidationErrors,
];
