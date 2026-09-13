import mongoose from "mongoose";
import app from "../server/index.js";

let mongoPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing");
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000
    });
  }

  await mongoPromise;
}

export default async function handler(req, res) {
  try {
    await connectDB();

    return app(req, res);
  } catch (error) {
    console.error("Vercel API error:", error);

    return res.status(500).json({
      error: "Database connection failed",
      detail: error.message
    });
  }
}