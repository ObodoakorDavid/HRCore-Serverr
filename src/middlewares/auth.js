import { verifyToken } from "../config/token.js";
import ApiError from "../utils/apiError.js";
import asyncWrapper from "./asyncWrapper.js";

const isAuth = asyncWrapper(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No Token Provided");
  }
  const token = authHeader.split(" ")[1];
  const payload = verifyToken(token);

  if (!req?.user?.roles?.includes("admin")) {
    req.admin = payload;
  }

  if (!req?.user?.roles?.includes("tenant")) {
    req.tenantAdmin = payload;
  }

  if (!req?.user?.roles?.includes("employee")) {
    req.employee = payload;
  }
  //Holds whichever user is logged in
  req.user = payload;
  next();
});

//Checks if the user is an admin
const isAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.admin) {
    throw ApiError.unauthorized("Admins Only");
  }
  next();
});

//Checks if the user is an employee
const isEmployee = asyncWrapper(async (req, res, next) => {
  if (!req?.employee) {
    throw ApiError.unauthorized("Employees Only");
  }

  next();
});

//Checks if the user is a tenantAdmin
const isTenantAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.tenantAdmin) {
    throw ApiError.unauthorized("Tenant Admins Only");
  }
  next();
});

const isTenantAdminOrAdmin = asyncWrapper(async (req, res, next) => {
  if (!req?.tenantAdmin || !req?.admin) {
    throw ApiError.unauthorized("Tenant Admins and Admins Only");
  }

  next();
});

export { isAuth, isAdmin, isTenantAdmin, isEmployee, isTenantAdminOrAdmin };
