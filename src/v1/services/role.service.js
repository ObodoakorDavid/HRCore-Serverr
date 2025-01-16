import Role from "../models/role.model.js"; // Adjust path as needed
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { paginate } from "../../utils/paginate.js";

async function addRole(roleData = {}, tenantId) {
  const { name, description } = roleData;

  // Check if a role with the same name already exists for the tenant
  const existingRole = await Role.findOne({ name, tenantId });
  if (existingRole) {
    throw ApiError.badRequest("A role with this name already exists.");
  }

  // Create a new role
  const role = new Role({
    name,
    description,
    tenantId,
  });
  await role.save();
  return ApiSuccess.created("Role added successfully", role);
}

async function getRoles(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const { documents: roles, pagination } = await paginate(
    Role,
    filter,
    page,
    limit,
    sort
  );

  return ApiSuccess.created("Roles retrieved successfully", {
    roles,
    pagination,
  });
}

async function getRole(roleId, tenantId) {
  if (!roleId) {
    throw ApiError.badRequest("RoleId not provided");
  }
  const role = await Role.findOne({ _id: roleId, tenantId });
  if (!role) {
    throw ApiError.badRequest("No role with the roleId provided");
  }
  return ApiSuccess.created("Role retrieved successfully", { role });
}

async function updateRole(roleId, roleData, tenantId) {
  if (!roleId) {
    throw ApiError.badRequest("RoleId not provided");
  }

  const role = await Role.findOneAndUpdate(
    { _id: roleId, tenantId },
    { ...roleData },
    { runValidators: true, new: true }
  );

  if (!role) {
    throw ApiError.badRequest("No role found with the provided roleId");
  }
  await role.save();
  return ApiSuccess.created("Role added successfully", role);
}

async function deleteRole(roleId, tenantId) {
  if (!roleId) {
    throw ApiError.badRequest("RoleId not provided");
  }

  const role = await Role.findOne({ _id: roleId, tenantId });

  if (!role) {
    throw ApiError.badRequest("No role found with the provided roleId");
  }

  // Delete the role
  await role.deleteOne();
  return ApiSuccess.created("Role deleted successfully", { role });
}

export default {
  addRole,
  getRoles,
  getRole,
  updateRole,
  deleteRole,
};
