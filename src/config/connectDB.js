import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async (url) => {
  return await mongoose.connect(url, {
    dbName: process.env.NODE_ENV == "development" ? "HRCore" : "HRCore-Live",
  });
};

export default connectDB;
