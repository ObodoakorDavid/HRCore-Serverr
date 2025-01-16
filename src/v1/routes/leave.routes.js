import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  addLeaveType,
  getLeaveTypes,
  updateLeaveType,
  deleteLeaveType,
  requestLeave,
  getLeaveRequests,
  getSingleLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
} from "../controllers/leave.controller.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { isEmployee, isTenantAdmin } from "../../middlewares/auth.js";
import {
  leaveTypeValidator,
  leaveTypeUpdateValidator,
  leaveRequestValidator,
  leaveRequestUpdateValidator,
} from "../validators/leave.validator.js";

const router = express.Router();

// Leave Types Routes
router
  .route("/leave-type")
  .get(tenantMiddleware, getLeaveTypes) // Get all leave types for the tenant
  .post(tenantMiddleware, isTenantAdmin, leaveTypeValidator, addLeaveType) // Add a new leave type
  .all(methodNotAllowed);

router
  .route("/leave-type/:leaveTypeId")
  .put(
    tenantMiddleware,
    isTenantAdmin,
    leaveTypeUpdateValidator,
    updateLeaveType
  ) // Update leave type
  .delete(tenantMiddleware, isTenantAdmin, deleteLeaveType) // Delete leave type
  .all(methodNotAllowed);

// Leave Requests Routes
router
  .route("/leave-request")
  .get(tenantMiddleware, getLeaveRequests) // Get all leave requests for the tenant
  .post(tenantMiddleware, isEmployee, leaveRequestValidator, requestLeave) // Request a new leave
  .all(methodNotAllowed);

router
  .route("/leave-request/:leaveRequestId")
  .get(tenantMiddleware, getSingleLeaveRequest) // Get a specific leave request
  .put(tenantMiddleware, leaveRequestUpdateValidator, updateLeaveRequest) // Update leave request (approve, change dates, etc.)
  .delete(tenantMiddleware, deleteLeaveRequest) // Delete leave request
  .all(methodNotAllowed);

export default router;
