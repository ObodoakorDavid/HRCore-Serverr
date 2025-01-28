import {
  LeaveHistory,
  EmployeeLeaveBalance,
  LeaveType,
} from "../models/leave.model.js";
import ApiError from "../../utils/apiError.js";
import ApiSuccess from "../../utils/apiSuccess.js";
import { paginate } from "../../utils/paginate.js";
import Employee from "../models/employee.model.js";
import levelService from "./level.service.js";
import mongoose from "mongoose";

async function requestLeave(leaveData = {}, employeeId, tenantId) {
  const { leaveTypeId, startDate, resumptionDate, duration, description } =
    leaveData;

  // Validate leave balance
  let leaveBalance = await EmployeeLeaveBalance.findOne({
    employeeId,
    leaveTypeId,
  });

  console.log(leaveBalance);

  if (!leaveBalance) {
    const leaveType = await LeaveType.findById(leaveTypeId);

    if (!leaveType) {
      throw ApiError.badRequest("No leave with the leaveTypeId");
    }

    leaveBalance = await EmployeeLeaveBalance.create({
      employee: employeeId,
      leaveType: leaveTypeId,
      balance: leaveType.defaultBalance,
      tenantId,
    });
  }

  if (!leaveBalance || leaveBalance.balance < duration) {
    throw ApiError.badRequest("Insufficient leave balance.");
  }

  leaveBalance.balance = leaveBalance.balance - duration;

  const employee = await Employee.findById(employeeId);

  if (!employee.lineManager) {
    throw ApiError.badRequest("Update your line manager information first");
  }

  // Create leave request
  const leaveRequest = new LeaveHistory({
    tenantId,
    employee: employeeId,
    lineManager: employee.lineManager,
    leaveType: leaveTypeId,
    startDate,
    resumptionDate,
    duration,
    description,
    tenantId,
    status: "pending",
  });

  await leaveRequest.save();
  await leaveBalance.save();

  console.log(leaveBalance);
  // Send mail to the line manager

  return ApiSuccess.created(
    "Leave request submitted successfully",
    leaveRequest
  );
}

async function getLeaveRequests(query = {}, tenantId) {
  const {
    page = 1,
    limit = 10,
    search,
    sort = { createdAt: -1 },
    employee,
    lineManager,
  } = query;

  console.log({ query });

  const filter = { tenantId };
  const conditions = [];

  // Add search condition if present
  if (search) {
    conditions.push({
      $or: [
        { description: { $regex: search, $options: "i" } },
        { status: { $regex: search, $options: "i" } },
      ],
    });
  }

  // Add employee condition if present
  if (employee) {
    conditions.push({ employee: employee });
  }

  // Add line manager condition if present
  if (lineManager) {
    conditions.push({ lineManager: lineManager });
  }

  // If we have any conditions, add them to the filter using $and
  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  const populateOptions = [
    {
      path: "employee",
      select: "name",
    },
    {
      path: "lineManager",
      select: "name",
    },
  ];

  console.log(query);

  const { documents: leaveRequests, pagination } = await paginate({
    model: LeaveHistory,
    query: filter,
    page,
    limit,
    sort,
    populateOptions,
  });

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

async function updateLeaveRequest(
  leaveId,
  leaveRequestData,
  employeeId,
  tenantId
) {
  if (!leaveId) {
    throw ApiError.badRequest("LeaveId not provided.");
  }

  const { status, reason } = leaveRequestData;

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

  // TODO check if the person trying to update is the lineManager

  // Update leave request status
  leaveRequest.status = status;

  // If approved, deduct leave balance
  if (status === "rejected") {
    const leaveBalance = await EmployeeLeaveBalance.findOne({
      employeeId: leaveRequest.employee,
      tenantId: tenantId,
    });

    leaveBalance.balance += leaveRequest.duration;
    leaveRequest.rejectedBy = employeeId;
    leaveRequest.reason = reason;
    await leaveBalance.save();
  } else if (status === "approved") {
    leaveRequest.rejectedBy = employeeId;
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
  const { name, defaultBalance, levelId } = leaveTypeData;

  // Check if the leave type already exists in the level by name using aggregation
  // Use lean() for faster queries, returning plain objects
  const levelWithLeaveType = await levelService.getLevelById(
    levelId,
    tenantId,
    true,
    [{ path: "leaveTypes", select: "name" }]
  );

  console.log(levelWithLeaveType);

  // Check if the leave type name already exists in the level's leaveTypes array
  const leaveTypeExistsInLevel = levelWithLeaveType.leaveTypes.some(
    (leaveType) => leaveType.name === name.toLowerCase()
  );

  if (leaveTypeExistsInLevel) {
    throw ApiError.badRequest(
      "A leave type with this name already exists in this level."
    );
  }

  // Create a new leave type
  const leaveType = new LeaveType({ name, defaultBalance, tenantId, levelId });
  await leaveType.save();

  // Atomically update the level with the new leave type, using $push for atomicity
  await levelService.updateLevel(
    levelId,
    {
      $push: { leaveTypes: leaveType },
    },
    tenantId
  );

  // Find all employees under this level
  const employees = await Employee.find({ levelId, tenantId }).lean();

  // Add the leave type with the default balance to all employees in EmployeeLeaveBalance
  const employeeLeaveBalances = employees.map((employee) => ({
    tenantId,
    employeeId: employee._id,
    leaveTypeId: leaveType._id,
    balance: defaultBalance,
  }));

  // Use bulk insert to add leave balances for all employees
  await EmployeeLeaveBalance.insertMany(employeeLeaveBalances);

  return ApiSuccess.created("Leave type added successfully", leaveType);
}

// Get Leave Types with Pagination.
async function getLeaveTypes(query = {}, tenantId) {
  const { page = 1, limit = 10, search, sort = { createdAt: -1 } } = query;

  const filter = { tenantId };
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  const populateOptions = [
    {
      path: "levelId",
      select: "name",
    },
  ];

  const { documents: leaveTypes, pagination } = await paginate({
    model: LeaveType,
    query: filter,
    page,
    limit,
    populateOptions,
  });

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
    const employeesToUpdate = await EmployeeLeaveBalance.find({
      leaveTypeId,
      tenantId,
    });

    const bulkUpdates = employeesToUpdate.map((balance) => ({
      updateOne: {
        filter: { _id: balance._id },
        update: {
          $set: { balance: leaveTypeData.defaultBalance },
        },
      },
    }));

    // Perform a bulk write for efficiency
    if (bulkUpdates.length) {
      await EmployeeLeaveBalance.bulkWrite(bulkUpdates);
    }
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

async function getLeaveBalance(employeeId, tenantId) {
  if (!mongoose.Types.ObjectId.isValid(employeeId)) {
    throw ApiError.badRequest("Invalid employeeId provided.");
  }

  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    throw ApiError.badRequest("Invalid tenantId provided.");
  }

  const leaveBalances = await EmployeeLeaveBalance.aggregate([
    {
      $match: {
        employeeId: new mongoose.Types.ObjectId(employeeId),
        tenantId: new mongoose.Types.ObjectId(tenantId),
        // employeeId: employeeId,
        // tenantId: tenantId,
      },
    },
    {
      $lookup: {
        from: "leavetypes", // The name of the LeaveType collection in MongoDB
        localField: "leaveTypeId",
        foreignField: "_id",
        as: "leaveTypeDetails",
      },
    },
    {
      $unwind: {
        path: "$leaveTypeDetails",
        preserveNullAndEmptyArrays: true, // In case there's no matching LeaveType
      },
    },
    {
      $project: {
        _id: 0, // Exclude _id field
        leaveTypeId: 1,
        balance: 1,
        "leaveTypeDetails.name": 1,
        "leaveTypeDetails.defaultBalance": 1,
      },
    },
  ]);

  // Return empty array if no balances are found
  return ApiSuccess.ok("Leave balance retrieved successfully", {
    leaveBalance: leaveBalances.length > 0 ? leaveBalances : [],
  });
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
  getLeaveBalance,
};
