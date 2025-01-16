import {
  LeaveHistory,
  EmployeeLeaveBalance,
  LeaveType,
} from "../models/leave.model.js";
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { paginate } from "../../utils/paginate.js";
import Empployee from "../models/employee.model.js";

async function requestLeave(leaveData = {}, employeeId, tenantId) {
  const { leaveTypeId, startDate, endDate, daysTaken, description } = leaveData;

  // Calculate the difference between startDate and endDate in days
  const start = new Date(startDate);
  const end = new Date(endDate);
  // Calculate the difference in days (rounding up)
  const diffTime = end - start; // Difference in milliseconds
  const calculatedDaysTaken = Math.ceil(diffTime / (1000 * 3600 * 24)); // Converting milliseconds to days

  if (calculatedDaysTaken !== daysTaken) {
    throw ApiError.badRequest(
      "The difference between the start and end date must equal the days taken."
    );
  }

  // Validate leave balance
  let leaveBalance = await EmployeeLeaveBalance.findOne({
    employeeId,
    leaveTypeId,
  });

  if (!leaveBalance) {
    const leaveType = await LeaveType.findById(leaveTypeId);

    leaveBalance = await EmployeeLeaveBalance.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      balance: leaveType.defaultBalance,
      tenantId,
    });
  }

  if (!leaveBalance || leaveBalance.balance < daysTaken) {
    throw ApiError.badRequest("Insufficient leave balance.");
  }

  const employee = await Empployee.findById(employeeId);

  // if (!employee.lineManager) {
  //   throw ApiError.badRequest("Update your line manager information");
  // }

  // Create leave request
  const leaveRequest = new LeaveHistory({
    tenantId,
    employee: employeeId,
    // lineManager: employee.lineManager,
    lineManager: employeeId,
    leaveType: leaveTypeId,
    startDate,
    endDate,
    daysTaken,
    description,
    tenantId,
    status: "pending",
  });

  await leaveRequest.save();

  // Send mail to the line manager

  return ApiSuccess.created(
    "Leave request submitted successfully",
    leaveRequest
  );
}

async function getLeaveRequests(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.$or = [
      { description: { $regex: search, $options: "i" } },
      { status: { $regex: search, $options: "i" } },
    ];
  }

  const { documents: leaveRequests, pagination } = await paginate(
    LeaveHistory,
    filter,
    page,
    limit,
    sort
  );

  return ApiSuccess.ok("Leave requests retrieved successfully", {
    leaveRequests,
    pagination,
  });
}

async function getSingleLeaveRequest(leaveId, tenantId) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  const leaveRequest = await LeaveHistory.findOne({ _id: leaveId, tenantId });
  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  return ApiSuccess.ok("Leave request retrieved successfully", leaveRequest);
}

async function updateLeaveRequest(leaveId, status, tenantId) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  // Validate status
  if (!["approved", "rejected"].includes(status)) {
    throw ApiError.badRequest("Invalid status.");
  }

  // Find the leave request
  const leaveRequest = await LeaveHistory.findOne({ _id: leaveId, tenantId });
  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  // Update leave request status
  leaveRequest.status = status;

  // If approved, deduct leave balance
  if (status === "approved") {
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.fromEmployeeId,
      leaveTypeId: leaveRequest.leaveTypeId,
    });

    if (!leaveBalance) {
      throw ApiError.badRequest("Leave balance record not found.");
    }

    if (leaveBalance.balance < leaveRequest.daysTaken) {
      throw ApiError.badRequest("Insufficient leave balance for approval.");
    }

    leaveBalance.balance -= leaveRequest.daysTaken;
    await leaveBalance.save();
  }

  await leaveRequest.save();
  return ApiSuccess.created(
    "Leave request status updated successfully",
    leaveRequest
  );
}

async function deleteLeaveRequest(leaveId, tenantId) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  const leaveRequest = await LeaveHistory.findOneAndDelete({
    _id: leaveId,
    tenantId,
  });
  if (!leaveRequest) {
    throw ApiError.badRequest(
      "No leave request found with the provided leaveId."
    );
  }

  return ApiSuccess.ok("Leave request deleted successfully", leaveRequest);
}

// -- LeaveType ------------------------------------------

// Add LeaveType
async function addLeaveType(leaveTypeData = {}, tenantId) {
  const { name, defaultBalance } = leaveTypeData;

  // Check if the leave type already exists for the tenant
  const existingLeaveType = await LeaveType.findOne({ name, tenantId });
  if (existingLeaveType) {
    throw ApiError.badRequest("A leave type with this name already exists.");
  }

  // Create a new leave type
  const leaveType = new LeaveType({ name, defaultBalance, tenantId });
  await leaveType.save();

  // Initialize leave balances for all employees under the tenant
  const employees = await EmployeeLeaveBalance.distinct("employeeId", {
    tenantId,
  });
  const leaveBalances = employees.map((employeeId) => ({
    employeeId,
    leaveTypeId: leaveType._id,
    balance: defaultBalance,
  }));
  if (leaveBalances.length > 0) {
    await EmployeeLeaveBalance.insertMany(leaveBalances);
  }

  return ApiSuccess.created("Leave type added successfully", leaveType);
}

// Get Leave Types with Pagination.
async function getLeaveTypes(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const { documents: leaveTypes, pagination } = await paginate(
    LeaveType,
    filter,
    page,
    limit,
    sort
  );

  return ApiSuccess.ok("Leave types retrieved successfully", {
    leaveTypes,
    pagination,
  });
}

// Update an existing Leave Type.
async function updateLeaveType(leaveTypeId, leaveTypeData, tenantId) {
  if (!leaveTypeId) {
    throw ApiError.badRequest("LeaveTypeId not provided.");
  }

  // Update the leave type
  const leaveType = await LeaveType.findOneAndUpdate(
    { _id: leaveTypeId, tenantId },
    { ...leaveTypeData },
    { runValidators: true, new: true }
  );

  if (!leaveType) {
    throw ApiError.badRequest(
      "No leave type found with the provided leaveTypeId."
    );
  }

  // If the default balance is updated, adjust leave balances for all employees
  if (leaveTypeData.defaultBalance !== undefined) {
    await EmployeeLeaveBalance.updateMany(
      { leaveTypeId, tenantId },
      { $set: { balance: leaveTypeData.defaultBalance } }
    );
  }

  return ApiSuccess.ok("Leave type updated successfully", leaveType);
}

// Delete a Leave Type.
async function deleteLeaveType(leaveTypeId, tenantId) {
  if (!leaveTypeId) {
    throw ApiError.badRequest("LeaveTypeId not provided.");
  }

  // Find and delete the leave type
  const leaveType = await LeaveType.findOneAndDelete({
    _id: leaveTypeId,
    tenantId,
  });
  if (!leaveType) {
    throw ApiError.badRequest(
      "No leave type found with the provided leaveTypeId."
    );
  }

  // Remove corresponding leave balances
  await EmployeeLeaveBalance.deleteMany({ leaveTypeId });

  return ApiSuccess.ok("Leave type deleted successfully", leaveType);
}

export default {
  addLeaveType,
  updateLeaveType,
  deleteLeaveType,
  getLeaveTypes,
  requestLeave,
  updateLeaveRequest,
  getLeaveRequests,
  getSingleLeaveRequest,
  deleteLeaveRequest,
};
