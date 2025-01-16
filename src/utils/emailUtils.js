import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import OTP from "../v1/models/otp.model.js";
import generateOTP from "../utils/generateOTP.js";
import createTransporter from "../lib/emailTransporter.js";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get the directory name from import.meta.url
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define emailTemplatePath and transporter as shared values
const otpEmailTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "OTPTemplate.html"
);
const inviteEmailTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "InviteTemplate.html"
);
const tenantEmailTemplatePath = path.join(
  __dirname,
  "..",
  "templates",
  "TenantTemplate.html"
);

const transporter = createTransporter();

// Read and compile templates
const otpEmailTemplateSource = fs.readFileSync(otpEmailTemplatePath, "utf8");
const inviteEmailTemplateSource = fs.readFileSync(
  inviteEmailTemplatePath,
  "utf8"
);
const tenantEmailTemplateSource = fs.readFileSync(
  tenantEmailTemplatePath,
  "utf8"
);

const otpTemplate = handlebars.compile(otpEmailTemplateSource);
const inviteTemplate = handlebars.compile(inviteEmailTemplateSource);
const tenantTemplate = handlebars.compile(tenantEmailTemplateSource);

const defaultSender = process.env.ADMIN_EMAIL;

// Function to send email
async function sendEmail({ from, to, subject, text, html }) {
  try {
    const mailOptions = {
      from: from || defaultSender,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Function to send OTP
async function sendOTP(email, userName) {
  try {
    await OTP.findOneAndDelete({ email });
    const otp = generateOTP();
    await OTP.create({ email, otp });

    const subject = "OTP Request";
    const date = new Date().toLocaleString();
    const emailText = `Hello ${userName},\n\nYour OTP is: ${otp}`;
    const html = otpTemplate({ userName, otp, date });

    return sendEmail({
      to: email,
      subject,
      text: emailText,
      html,
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    throw error;
  }
}

// Function to send Invitation email
async function sendInvitation({
  email,
  userName,
  tenantName,
  inviteUrl,
  plainPassword,
}) {
  try {
    const subject = `Invitation to Join ${tenantName} on HRCore`;

    const emailText = `
      Hello ${userName},\n\n
      You have been invited to join the ${tenantName} On HRCore. Your temporary password is: ${plainPassword}.
      Please click the link below to complete your registration:\n\n
      ${inviteUrl}
    `;

    const html = inviteTemplate({
      userName,
      tenantName,
      plainPassword,
      inviteUrl,
    });

    return sendEmail({
      to: email,
      subject,
      text: emailText,
      html,
    });
  } catch (error) {
    console.error("Error sending Invitation email:", error);
    throw error;
  }
}

// Function to send Tenant Welcome email
async function sendWelcomeEmailToTenant({
  tenantId,
  email,
  plainPassword,
  loginUrl,
}) {
  try {
    const subject = "Welcome to HRCore";

    const emailText = `
      A Tenant Account was created for you on HRCore.\n\n
      Your temporary password is: ${plainPassword}.\n\n
      Please log on to your account and change this password.\n\n
      Click the link below to login:\n
      ${loginUrl}
    `;

    const html = tenantTemplate({ plainPassword, loginUrl, tenantId });

    return sendEmail({
      to: email,
      subject,
      text: emailText,
      html,
    });
  } catch (error) {
    console.error("Error sending Tenant email:", error);
    throw error;
  }
}

// Export functions as an object
export default {
  sendEmail,
  sendOTP,
  sendInvitation,
  sendWelcomeEmailToTenant, // Exporting the sendEmailToTenant function
};
