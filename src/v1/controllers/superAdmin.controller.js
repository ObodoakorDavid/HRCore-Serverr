import asyncWrapper from "../../middlewares/asyncWrapper.js";
import employeeService from "../services/employee.service.js";

//Admins
export const getEmployees = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const { employeeId } = req.employee;
  const result = await employeeService.getEmployees(
    query,
    tenantId,
    employeeId
  );
  res.status(200).json(result);
});

export const makeEmployeeAdmin = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.params;
  const { isAdmin } = req.body;
  const result = await employeeService.makeEmployeeAdmin(employeeId, tenantId, {
    isAdmin,
  });
  res.status(201).json(result);
});

export const updateEmployeeByAdmin = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { employeeId } = req.params;
  const profileData = req.body;
  const result = await employeeService.updateProfile(
    employeeId,
    tenantId,
    profileData,
    req?.files?.file ? req.files?.file : null
  );
  res.status(200).json(result);
});

