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

    /*
     * Vercel catch-all routes can expose the path through
     * req.url and req.path differently.
     *
     * Preserve the complete requested path.
     */
    const url = new URL(
      req.url || '/',
      `https://${req.headers.host || 'localhost'}`
    );

    let pathname = url.pathname;

    /*
     * The Express app expects /api/... routes.
     * Add /api only when Vercel has removed it.
     */
    if (!pathname.startsWith('/api/')) {
      pathname = `/api${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
    }

    req.url = `${pathname}${url.search}`;

    return app(req, res);
  } catch (error) {
    console.error('VERCEL API ERROR:', error);

    return res.status(500).json({
      error: 'API request failed',
      detail: error.message,
    });
  }
}