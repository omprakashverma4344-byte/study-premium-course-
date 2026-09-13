# Deployment

## Render (recommended API + website)

- Create a Web Service from this repository.
- Build: `npm install`
- Start: `npm start`
- Add all variables from `.env.example`.
- MongoDB Atlas Network Access must allow the Render service to connect (use Atlas's current documented network policy; avoid exposing credentials in code).

## Vercel

The app is intentionally deployable as one Render service. If you want Vercel as the frontend, deploy `public` as a static project and point `API_BASE` in `public/assets/app.js` to your Render URL. Replace `YOUR-RENDER-SERVICE.onrender.com` in `vercel.json` if using the included rewrite.

## Cloudflare Pages

Deploy the `public` directory. Point `API_BASE` in `public/assets/app.js` to your Render API. Cloudflare is then the frontend/CDN layer while Render hosts the Node API.

## MongoDB Atlas

Create a database named `study-premium-course`, create a database user, copy the SRV connection string and set `MONGODB_URI` in the deployment platform. Do not put the URI in GitHub.

## Backblaze B2

Create a private bucket. Create an application key with the minimum required bucket permissions. Put S3-compatible endpoint, region, key ID, application key and bucket into environment variables. The server uses short-lived signed URLs.

## QR

For manual UPI payments, replace the placeholder QR area with your real QR image. The server still requires a UTR and admin approval; a QR scan alone never grants access.
