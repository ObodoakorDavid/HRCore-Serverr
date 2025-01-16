import { body } from "express-validator";
import { handleValidationErrors } from "../../middlewares/error.js";
import ApiError from "../../utils/apiError.js";

export const employeeLogInValidator = [
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

export const employeeSignUpValidator = [
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

  body("token")
    .exists()
    .withMessage("token is required")
    .isString()
    .withMessage("token must be a string"),

  handleValidationErrors,
];

export const employeeInviteValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("expiresIn")
    .exists()
    .withMessage("expiresIn is required")
    .isInt({ min: 1 })
    .withMessage("Expires in must be greater than 1"),

  handleValidationErrors,
];

export const employeeForgotPasswordValidator = [
  body("email")
    .exists()
    .withMessage("email is required")
    .isEmail()
    .withMessage("Please provide a valid email address"),

  handleValidationErrors,
];

export const employeeResetPasswordValidator = [
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

export const bulkEmployeeInviteValidator = [
  (req, res, next) => {
    // console.log({ files: req.files, body: req.body });

    if (!req.files) {
      throw ApiError.badRequest("Please upload a file");
    }

    const file = req.files.file;
    const validFileTypes = ["text/csv"];

    if (!validFileTypes.includes(file.mimetype)) {
      throw ApiError.badRequest(
        "Invalid file type. Only CSV files are allowed"
      );
    }

    // Check if file size is acceptable (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      throw ApiError.badRequest(
        "File size exceeds the maximum allowed size (10MB)"
      );
    }

    next();
  },
  handleValidationErrors,
];
