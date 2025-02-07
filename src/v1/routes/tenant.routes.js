import express from "express";
import methodNotAllowed from "../../middlewares/methodNotAllowed.js";
import {
  getAllInviteLinks,
  getTenant,
  getTenantDetails,
  tenantForgotPassword,
  tenantLogin,
  tenantResetPassword,
} from "../controllers/tenant.controller.js";
import { validateMongoIdParam } from "../validators/param.validator.js";
import { tenantMiddleware } from "../../middlewares/tenant.middleware.js";
import {
  tenantForgotPasswordValidator,
  tenantLoginValidator,
  tenantResetPasswordValidator,
} from "../validators/tenant.validator.js";
import { isAuth, isTenantAdmin } from "../../middlewares/auth.js";

const router = express.Router();

//Authentication
router
  .route("/auth")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getTenantDetails)
  .all(methodNotAllowed);

router
  .route("/auth/signin")
  .post(tenantLoginValidator, tenantLogin)
  .all(methodNotAllowed);

router
  .route("/auth/forgot-password")
  .post(tenantForgotPasswordValidator, tenantForgotPassword)
  .all(methodNotAllowed);

router
  .route("/auth/reset-password")
  .post(tenantResetPasswordValidator, tenantResetPassword)
  .all(methodNotAllowed);

router
  .route("/link")
  .get(tenantMiddleware, isAuth, isTenantAdmin, getAllInviteLinks)
  .all(methodNotAllowed);

//Public
router
  .route("/:tenantId")
  .get(validateMongoIdParam("tenantId"), getTenant)
  .all(methodNotAllowed);

export default router;
