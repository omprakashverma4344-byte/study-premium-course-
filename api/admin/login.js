import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { signAdmin } from "../../server/middleware/auth.js";

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
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  try {
    await connectDB();

    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required"
      });
    }

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const valid = await bcrypt.compare(
      password,
      await bcrypt.hash(process.env.ADMIN_PASSWORD || "", 10)
    );

    if (!valid) {
      return res.status(401).json({
        error: "Invalid credentials"
      });
    }

    const token = signAdmin(email);

    res.setHeader(
      "Set-Cookie",
      `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`
    );

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);

    return res.status(500).json({
      error: "Server error",
      detail: error.message
    });
  }
}