import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  bulkEmployeeInviteValidator,
  employeeForgotPasswordValidator,
  employeeInviteValidator,
  employeeLogInValidator,
  employeeProfileUpdateValidator,
  employeeResetPasswordValidator,
  employeeSignUpValidator,
} from "../validators/employee.validator.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import {
  acceptInvite,
  employeeBulkInvite,
  employeeForgotPassword,
  employeeLogin,
  employeeResetPassword,
  employeeSignUp,
  getEmployeeDetails,
  getEmployees,
  sendInviteToEmployee,
  updateEmployeeProfile,
} from "../controllers/employee.controller.js";
import { isAuth, isEmployee, isTenantAdmin } from "../../middlewares/auth.js";

const router = express.Router();

router.route("/").get(tenantMiddleware, getEmployees).all(methodNotAllowed);

router
  .route("/auth")
  .get(tenantMiddleware, isAuth, isEmployee, getEmployeeDetails)
  .all(methodNotAllowed);

router
  .route("/auth/profile")
  .put(
    tenantMiddleware,
    isAuth,
    isEmployee,
    employeeProfileUpdateValidator,
    updateEmployeeProfile
  )
  .all(methodNotAllowed);

router
  .route("/auth/signin")
  .post(employeeLogInValidator, employeeLogin)
  .all(methodNotAllowed);

router
  .route("/auth/signup")
  .post(tenantMiddleware, employeeSignUpValidator, employeeSignUp)
  .all(methodNotAllowed);

router
  .route("/auth/forgot-password")
  .post(employeeForgotPasswordValidator, employeeForgotPassword)
  .all(methodNotAllowed);

router
  .route("/auth/reset-password")
  .post(employeeResetPasswordValidator, employeeResetPassword)
  .all(methodNotAllowed);

router
  .route("/invite")
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    employeeInviteValidator,
    sendInviteToEmployee
  )
  .put(tenantMiddleware, acceptInvite)
  .all(methodNotAllowed);

router
  .route("/bulk-invite")
  .post(
    tenantMiddleware,
    isAuth,
    isTenantAdmin,
    bulkEmployeeInviteValidator,
    employeeBulkInvite
  )
  .all(methodNotAllowed);

export default router;
