import ApiSuccess from "../../utils/apiSuccess.js";
import Employee from "../models/employee.model.js";
import { hashPassword, validatePassword } from "../../utils/validationUtils.js";
import ApiError from "../../utils/apiError.js";
import tenantService from "./tenant.service.js";
import { generateToken, verifyToken } from "../../config/token.js";
import crypto from "crypto";
import Link from "../models/link.model.js";
import emailUtils from "../../utils/emailUtils.js";
import { paginate } from "../../utils/paginate.js";
import {
  extractAndValidateData,
  parseCSVFile,
  saveFileToUploads,
} from "../../utils/csvParserUtil.js";
import PasswordReset from "../models/passwordReset.model.js";

// async function addEmployeeToTenant(employeeData = {}) {
//   const { email, password, tenantId } = employeeData;
//   await tenantService.getTenant(tenantId);
//   const hashedPassword = await hashPassword(password);

//   const employeeExists = await Employee.findOne({ email });

//   if (employeeExists) {
//     throw ApiError.badRequest("Employee with this email already exists");
//   }

//   const employee = await Employee.create({
//     ...employeeData,
//     password: hashedPassword,
//   });

//   return ApiSuccess.created("Employee added successfully", {
//     employee,
//   });
// }

async function signIn(employeeData = {}) {
  const { email, password } = employeeData;
  const employee = await Employee.findOne({ email }).select("+password");

  if (!employee) {
    throw ApiError.badRequest("No User with this email");
  }

  if (!employee.isEmailVerified) {
    throw ApiError.badRequest("Email has not been verified");
  }

  await validatePassword(password, employee.password);

  const token = generateToken({
    employeeId: employee._id,
    isAdmin: employee.isAdmin,
    roles: ["employee"],
  });

  employee.password = undefined;

  return ApiSuccess.created("Login successfull", {
    employee,
    token,
  });
}

async function sendInviteToEmployee(InviteData = {}, tenantId) {
  const { email, expiresIn } = InviteData;

  const employee = await Employee.findOne({ email, tenantId });
  if (employee) {
    throw ApiError.badRequest("Employee with this email already exists");
  }

  const existingLink = await Link.findOne({ email });

  if (existingLink) {
    throw ApiError.badRequest("There is an existing link for this employee");
  }

  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresIn);

  const token = crypto.randomBytes(20).toString("hex");
  const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
  const hashedPassword = await hashPassword(plainPassword);

  // Create a new employee
  const newEmployee = await Employee.create({
    email,
    tenantId,
    password: hashedPassword,
  });

  const inviteUrl = `${process.env.FRONTEND_URL}/${tenant._id}/verify?token=${token}`;

  // Create a new link document in the database
  const link = await Link.create({
    tenantId,
    token,
    email,
    url: inviteUrl,
    expiresAt,
    status: "pending",
  });

  const mailOptions = {
    from: process.env.ADMIN_EMAIL,
    to: email,
    subject: `Invite to ${tenant.name} Leave Board`,
    text: `Hello, you have been invited to join ${tenant.name} leave board. Your temporary password is: ${plainPassword}. Click on the following link to accept the invite and complete your registration: ${inviteUrl}`,
    html: `
      <p>Hello,</p>
      <p>You have been invited to join <strong>${tenant.name}</strong> leave board.</p>
      <p>Your temporary password is: <strong>${plainPassword}</strong></p>
      <p>Click on the following link to accept the invite and login in </p>
      <a href="${inviteUrl}">Go To Leave Board</a>
    `,
  };

  try {
    const emailInfo = await emailUtils.sendEmail(mailOptions);
    await Link.findByIdAndUpdate(link._id, { isDelivered: true });
  } catch {
    await Link.findByIdAndUpdate(link._id, { isDelivered: false });
  }

  return ApiSuccess.ok(`Invite Link Sent To ${email}`);
}

async function acceptInvite(token, tenantId) {
  console.log({ token, tenantId });

  const link = await Link.findOne({
    token,
    tenantId,
  });

  if (!link) {
    throw ApiError.notFound("Invite link not valid");
  }

  if (link.hasBeenUsed) {
    throw ApiError.notFound("This link has been used");
  }

  if (new Date() > new Date(link.expiresAt)) {
    throw ApiError.badRequest("Invite link has expired");
  }

  const employee = await Employee.findOne({
    email: link.email,
    tenantId,
  });

  if (!employee) {
    throw ApiError.notFound("Invite link not valid");
  }

  employee.isEmailVerified = true;
  link.hasBeenUsed = true;
  link.status = "accepted";
  await employee.save();
  await link.save();

  return ApiSuccess.created("Invitation Accepted", {
    employee,
  });
}

async function getEmployeeDetails(employeeId, tenantId) {
  console.log({ employeeId, tenantId });

  const employee = await Employee.findOne({ _id: employeeId, tenantId });
  if (!employee) {
    throw ApiError.notFound("Employee not found");
  }

  return ApiSuccess.created("Employee Retrived Successfully  ", {
    employee,
  });
}

async function getEmployees(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const { documents: employees, pagination } = await paginate(
    Employee,
    filter,
    page,
    limit,
    sort
  );

  return ApiSuccess.created("Employee Retrived Successfully", {
    employees,
    pagination,
  });
}

async function employeeBulkInvite(file, tenantId) {
  const { data } = await tenantService.getTenant(tenantId);
  const tenant = data?.tenant;

  const tempFilePath = saveFileToUploads(file);

  const parsedData = await parseCSVFile(tempFilePath);

  if (parsedData.length < 1) {
    throw ApiError.badRequest("The csv file you provided is empty");
  }

  const invitations = extractAndValidateData(parsedData);

  console.log({ invitations });

  const newEmployees = [];

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  for (const invite of invitations) {
    const existingEmployee = await Employee.findOne({ email: invite.email });
    if (existingEmployee) {
      console.log(`Skipping already registered email: ${invite.email}`);
      continue; // Skip this iteration if the email is already registered
    }
    const token = crypto.randomBytes(20).toString("hex");
    const plainPassword = crypto.randomBytes(8).toString("hex"); // 8 characters
    const hashedPassword = await hashPassword(plainPassword);

    // Create a new employee
    const newEmployee = await Employee.create({
      email: invite.email,
      name: invite.name,
      tenantId,
      password: hashedPassword,
    });

    newEmployees.push(newEmployee);

    const inviteUrl = `${process.env.FRONTEND_URL}/${tenant._id}/verify?token=${token}`;

    // Create a new link document in the database
    const link = await Link.create({
      tenantId,
      token,
      name: invite.name,
      email: invite.email,
      url: inviteUrl,
      expiresAt,
      status: "pending",
    });

    const mailOptions = {
      email: invite.email,
      userName: invite.name,
      tenantName: tenant.name,
      inviteUrl,
      plainPassword,
      logo: tenant.logo,
    };

    try {
      const emailInfo = await emailUtils.sendInvitation(mailOptions);
      await Link.findByIdAndUpdate(link._id, { isDelivered: true });
    } catch {
      await Link.findByIdAndUpdate(link._id, { isDelivered: false });
    }
  }

  // fs.unlinkSync(tempFilePath);

  return ApiSuccess.ok(
    `${newEmployees.length} invitations have been sent successfully.`
  );
}

// Forgot Password
async function forgotPassword(email) {
  const employee = await Employee.findOne({ email }).populate("tenantId");
  if (!employee) {
    throw ApiError.badRequest("No user with this email");
  }

  const token = generateToken({ email });

  const passwordReset = new PasswordReset({
    email,
    token,
  });
  await passwordReset.save();

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const options = {
    email,
    resetUrl,
    name: employee.name ? employee.name : "User",
    color: employee.tenantId.color,
    tenantName: employee.tenantId.name,
    logo: employee.tenantId.logo,
  };

  try {
    await emailUtils.sendForgotPasswordEmail(options);
    return ApiSuccess.ok("Password reset email sent");
  } catch (error) {
    throw ApiError.internalServerError("Error sending reset email");
  }
}

async function resetPassword(token, newPassword) {
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

  const employee = await Employee.findOne({ email: decoded.email }).select(
    "+password"
  );
  if (!employee) {
    throw ApiError.notFound("User not found");
  }

  const hashedPassword = await hashPassword(newPassword);
  employee.password = hashedPassword;
  await employee.save();

  await PasswordReset.deleteOne({ token });

  return ApiSuccess.ok("Password has been reset successfully");
}

export default {
  // addEmployeeToTenant,
  signIn,
  forgotPassword,
  resetPassword,
  sendInviteToEmployee,
  getEmployeeDetails,
  acceptInvite,
  getEmployees,
  employeeBulkInvite,
};
