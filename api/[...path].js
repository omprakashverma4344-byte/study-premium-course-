import mongoose from 'mongoose';
import app from '../server/index.js';

let mongoPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

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
     * Vercel catch-all route:
     * /api/admin/login
     * /api/admin/me
     * /api/admin/stats
     * /api/courses
     *
     * The complete path is available through req.query.path.
     */

    const routePath = req.query?.path;

    let pathname = '/api';

    if (Array.isArray(routePath) && routePath.length > 0) {
      pathname = `/api/${routePath.join('/')}`;
    } else if (typeof routePath === 'string' && routePath.trim()) {
      pathname = `/api/${routePath}`;
    }

    /*
     * Preserve query parameters such as:
     * ?page=1
     * ?search=test
     */
    const originalUrl = req.url || '/';

    let search = '';

    try {
      const parsedUrl = new URL(
        originalUrl,
        `https://${req.headers.host || 'localhost'}`
      );

      search = parsedUrl.search;
    } catch {
      search = '';
    }

    /*
     * Express expects the complete /api/... URL.
     */
    req.url = `${pathname}${search}`;

    console.log('VERCEL API ROUTE:', {
      method: req.method,
      originalUrl,
      routePath,
      finalUrl: req.url,
    });

    return app(req, res);
  } catch (error) {
    console.error('VERCEL API ERROR:', error);

    return res.status(500).json({
      error: 'API request failed',
      detail: error.message,
    });
  }
}