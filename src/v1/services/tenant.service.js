import Tenant from "../models/tenant.model.js"; // Adjust path as needed
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import { generateToken, verifyToken } from "../../config/token.js";
import { paginate } from "../../utils/paginate.js";
import Link from "../models/link.model.js";
import crypto from "crypto";
import emailUtils from "../../utils/emailUtils.js";
import PasswordReset from "../models/passwordReset.model.js";

async function addTenant(tenantData = {}) {
  const { name, logo, color, email } = tenantData;

  // Check if a tenant with the same name already exists
  const existingTenant = await Tenant.findOne({ name });
  if (existingTenant) {
    throw ApiError.badRequest("A tenant with this name already exists.");
  }
  const plainPassword = crypto.randomBytes(6).toString("hex");

  const hashedPassword = await hashPassword(plainPassword);

  // Create a new tenant
  const tenant = new Tenant({
    name,
    logo,
    color,
    email,
    password: hashedPassword,
  });
  await tenant.save();

  let message;
  let emailInfo;

  try {
    emailInfo = await emailUtils.sendWelcomeEmailToTenant({
      tenantId: tenant._id,
      email,
      plainPassword,
      loginUrl: `${process.env.FRONTEND_URL}/tenant/login`,
    });
  } catch {
    console.log("There was an error sending an email");
  }

  if (!emailInfo) {
    message = `Tenant added successfully but email deliver`;
  } else {
    message = `Tenant added successfully, credentials sent to ${emailInfo.envelope.to}`;
  }

  return ApiSuccess.created(message);
}

async function getTenants(query = {}) {
  const tenants = await Tenant.find({});
  return ApiSuccess.created("Tenants retrieved successfully", { tenants });
}

async function getTenant(tenantId) {
  if (!tenantId) {
    throw ApiError.badRequest("TenantId not provided");
  }
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.badRequest("No tenant with the tenantId provided");
  }
  return ApiSuccess.created("Tenant retrieved successfully", { tenant });
}

async function tenantLogin(tenantData) {
  const { email, password } = tenantData;
  const tenant = await Tenant.findOne({ email }).select("+password");

  if (!tenant) {
    throw ApiError.unauthorized("Invalid credentials");
  }

  await validatePassword(password, tenant.password);

  const token = generateToken({
    tenantId: tenant._id,
    roles: ["tenant"],
  });

  tenant.password = undefined;
  return ApiSuccess.created("Login successfully", {
    tenant,
    token,
  });
}

async function getTenantDetails(tenantId) {
  if (!tenantId) {
    throw ApiError.badRequest("TenantId not provided");
  }
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw ApiError.badRequest("No tenant with the tenantId provided");
  }
  return ApiSuccess.created("Tenant retrieved successfully", { tenant });
}

async function getLinks(query = {}) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = {};
  if (search) {
    filter.$or = [
      { tenantId: { $regex: search, $options: "i" } },
      { token: { $regex: search, $options: "i" } },
      { url: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const { documents: links, pagination } = await paginate(
    Link,
    filter,
    page,
    limit,
    sort
  );

  return ApiSuccess.created("Links retrieved successfully", {
    links,
    pagination,
  });
}

// Forgot Password
async function forgotPassword(email) {
  const tenant = await Tenant.findOne({ email });
  if (!tenant) {
    throw ApiError.badRequest("No user with this email");
  }

  const token = generateToken({ email });

  const passwordReset = new PasswordReset({
    email,
    token,
  });
  await passwordReset.save();

  const resetUrl = `${process.env.FRONTEND_URL}/tenant/reset-password?token=${token}`;

  // Send email with the password reset link
  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: "Password Reset Request",
    text: `Click on the following link to reset your password: ${resetUrl}`,
    html: `
      <p>Click on the following link to reset your password:</p>
      <a href="${resetUrl}">Reset Password</a>
    `,
  };

  try {
    await emailUtils.sendEmail(mailOptions);
    return ApiSuccess.ok("Password reset email sent");
  } catch (error) {
    throw ApiError.internalServerError("Error sending reset email");
  }
}

async function resetPassword(token, newPassword) {
  console.log({ token, newPassword });

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    throw ApiError.badRequest("Invalid or expired link");
  }

  const passwordReset = await PasswordReset.findOne({
    email: decoded.email,
    token,
  });

  if (!passwordReset) {
    throw ApiError.badRequest("Invalid or expired link");
  }

  const tenant = await Tenant.findOne({ email: decoded.email }).select(
    "+password"
  );
  if (!tenant) {
    throw ApiError.notFound("User not found");
  }

  const hashedPassword = await hashPassword(newPassword);
  tenant.password = hashedPassword;
  await tenant.save();

  await PasswordReset.deleteOne({ token });

  return ApiSuccess.ok("Password has been reset successfully");
}

export default {
  addTenant,
  getTenants,
  getTenant,
  tenantLogin,
  forgotPassword,
  resetPassword,
  getTenantDetails,
  getLinks,
};
