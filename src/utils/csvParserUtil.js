import fs from "fs";
import path from "path";
import csvParser from "csv-parser";
import { fileURLToPath } from "url";
import ApiError from "./apiError.js";

// Helper function to parse CSV file and extract data
export const parseCSVFile = (filePath) => {
  const results = [];
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (err) => reject(err));
  });
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Function to extract and validate necessary data from the parsed CSV
export const extractAndValidateData = (parsedData) => {
  const invitations = [];

  parsedData.forEach((row, index) => {
    const { name, email } = row;

    if (!name || !email) {
      throw ApiError.badRequest(
        "Each row must contain 'email' and 'name' fields"
      );
    }

    if (!emailRegex.test(email)) {
      throw ApiError.badRequest(
        `Invalid email format in row ${index + 1}: ${email}`
      );
    }

    invitations.push({ name, email });
  });

  return invitations;
};

export const saveFileToUploads = (file) => {
  try {
    // Resolve the directory and file path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const tempFilePath = path.join(__dirname, "..", "..", "uploads", file.name);

    // Ensure the directory exists
    if (!fs.existsSync(path.dirname(tempFilePath))) {
      fs.mkdirSync(path.dirname(tempFilePath), { recursive: true });
    }

    // Move the file to the target directory
    file.mv(tempFilePath, (err) => {
      if (err) {
        console.error("Error moving file:", err.message);
        throw new Error("Failed to save file. Please try again.");
      } else {
        console.log("File saved successfully at", tempFilePath);
      }
    });

    return tempFilePath; // Return the saved file path
  } catch (error) {
    console.error("Error in saveFileToUploads:", error.message);
    throw error;
  }
};
