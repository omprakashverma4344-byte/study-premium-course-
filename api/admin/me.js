import mongoose from "mongoose";
import { adminAuth } from "../../server/middleware/auth.js";

let dbPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!dbPromise) {
    dbPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
  }

  await dbPromise;
}

export default async function handler(req, res) {
  try {
    await connectDB();

    return adminAuth(req, res, () => {
      return res.status(200).json({
        admin: req.admin
      });
    });

  } catch (error) {
    console.error("ADMIN ME ERROR:", error);

    return res.status(500).json({
      error: "Server error",
      detail: error.message
    });
  }
}