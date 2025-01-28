import mongoose from "mongoose";
const { Schema } = mongoose;

const employeeSchema = new Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
    },
    name: {
      type: String,
    },
    username: {
      type: String,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    jobRole: {
      type: String,
    },
    documents: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          default: () => new mongoose.Types.ObjectId(),
        },
        url: {
          type: String,
          required: true,
        },
        fileType: {
          type: String,
          enum: ["image", "document"],
          required: true,
        },
      },
    ],
    role: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Role",
      default: null,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    lineManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    levelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Level",
      default: null,
    },
    leaveBalances: [
      {
        leaveType: {
          type: String,
          required: true,
        },
        balance: {
          type: Number,
          required: true,
          default: 0, // Default balance for new employees
          min: 0, // Prevent negative leave balances
        },
      },
    ],
  },
  { timestamps: true }
);

employeeSchema.statics.getEmployeeStats = async function () {
  try {
    const result = await this.aggregate([
      {
        $facet: {
          employeeStats: [
            {
              $group: {
                _id: "$levelId",
                count: { $sum: 1 },
              },
            },
          ],
          levels: [
            { $match: { $expr: { $ne: ["$levelId", null] } } },
            {
              $lookup: {
                from: "levels",
                localField: "levelId",
                foreignField: "_id",
                as: "levelInfo",
              },
            },
            { $unwind: "$levelInfo" },
            {
              $group: {
                _id: "$levelInfo._id",
                name: { $first: "$levelInfo.name" },
              },
            },
          ],
        },
      },
      {
        $project: {
          byLevel: {
            $map: {
              input: "$levels",
              as: "level",
              in: {
                levelId: "$$level._id",
                levelName: "$$level.name",
                totalEmployees: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        "$employeeStats.count",
                        {
                          $indexOfArray: ["$employeeStats._id", "$$level._id"],
                        },
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
          totalEmployees: { $sum: "$employeeStats.count" },
        },
      },
    ]);

    // const result = await this.aggregate([
    //   {
    //     $match: { levelId: { $ne: null } }, // Exclude null levelIds
    //   },
    //   {
    //     $group: {
    //       _id: "$levelId",
    //       count: { $sum: 1 },
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: "levels", // The name of the Level collection
    //       localField: "_id", // The _id from the previous $group stage (levelId)
    //       foreignField: "_id", // The _id field in the Level collection
    //       as: "levelInfo", // The name of the array field to store the populated data
    //     },
    //   },
    //   // {
    //   //   $unwind: "$levelInfo", // Flatten the array to get levelInfo as an object
    //   // },
    //   // {
    //   //   $project: {
    //   //     _id: 0, // Exclude the default _id field
    //   //     levelId: "$_id", // Include the levelId from the grouping stage
    //   //     count: 1, // Include the count
    //   //     levelName: "$levelInfo.name", // Include the name of the level
    //   //   },
    //   // },
    // ]);

    return result[0] || { byLevel: [], totalEmployees: 0 };
  } catch (error) {
    console.error("Error in getEmployeeStats:", error);
    throw error;
  }
};
export default mongoose.model("Employee", employeeSchema);
