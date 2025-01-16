import asyncWrapper from "../../middlewares/asyncWrapper.js";
import roleService from "../services/role.service.js";

export const addRole = asyncWrapper(async (req, res, next) => {
  const roleData = req.body;
  const { tenantId } = req.tenant;
  const result = await roleService.addRole(roleData, tenantId);
  res.status(201).json(result);
});

export const getRoles = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const query = req.query;
  const result = await roleService.getRoles(query, tenantId);
  res.status(200).json(result);
});

export const getSingleRole = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { roleId } = req.params;
  const result = await roleService.getRole(roleId, tenantId);
  res.status(200).json(result);
});

export const deleteRole = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const { roleId } = req.params;
  const result = await roleService.deleteRole(roleId, tenantId);
  res.status(200).json(result);
});

export const updateRole = asyncWrapper(async (req, res, next) => {
  const { tenantId } = req.tenant;
  const roleData = req.body;
  const { roleId } = req.params;
  const result = await roleService.updateRole(roleId, roleData, tenantId);
  res.status(200).json(result);
});
