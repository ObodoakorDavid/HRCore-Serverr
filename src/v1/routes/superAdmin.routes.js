import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import { employeeProfileUpdateValidator } from "../validators/employee.validator.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { updateEmployeeByAdmin } from "../controllers/employee.controller.js";
import { isAdmin, isAuth } from "../../middlewares/auth.js";
import { validateMongoIdParam } from "../validators/param.validator.js";
import { getEmployees } from "../controllers/superAdmin.controller.js";

const router = express.Router();

router
  .route("/")
  .get(tenantMiddleware, isAuth, isAdmin, getEmployees)
  .all(methodNotAllowed);

// Employee Admins
router
  .route("/employee/:employeeId")
  .put(
    tenantMiddleware,
    isAuth,
    isAdmin,
    employeeProfileUpdateValidator,
    // makeEmployeeAdminValidator,
    validateMongoIdParam("employeeId"),
    updateEmployeeByAdmin
  )
  .all(methodNotAllowed);

export default router;
