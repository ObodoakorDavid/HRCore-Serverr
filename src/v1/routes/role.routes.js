import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";

import {
  addRole,
  getRoles,
  deleteRole,
  getSingleRole,
  updateRole,
} from "../controllers/role.controller.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import { isTenantAdmin } from "../../middlewares/auth.js";
import {
  roleUpdateValidator,
  roleValidator,
} from "../validators/role.validator.js";

const router = express.Router();

// Get all roles
router
  .route("/")
  .get(tenantMiddleware, getRoles)
  .post(tenantMiddleware, isTenantAdmin, roleValidator, addRole)
  .all(methodNotAllowed);

// Delete a role
router
  .route("/:roleId")
  .get(tenantMiddleware, isTenantAdmin, getSingleRole)
  .put(tenantMiddleware, isTenantAdmin, roleUpdateValidator, updateRole)
  .delete(tenantMiddleware, isTenantAdmin, deleteRole)
  .all(methodNotAllowed);

export default router;
