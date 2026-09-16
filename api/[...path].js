import mongoose from 'mongoose';
import app from '../server/index.js';

let mongoPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing');
  }

  if (!mongoPromise) {
    mongoPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
  }

  await mongoPromise;
}

export default async function handler(req, res) {
  try {
    await connectDB();

    // Vercel catch-all route can provide different URL shapes.
    // Always normalize the request before passing it to Express.
    const originalUrl = req.url || '/';

    if (!originalUrl.startsWith('/api/')) {
      req.url = `/api${originalUrl.startsWith('/') ? originalUrl : `/${originalUrl}`}`;
    }

    return app(req, res);
  } catch (error) {
    console.error('VERCEL API ERROR:', error);

    return res.status(500).json({
      error: 'API request failed',
      detail: error.message,
    });
  }
}