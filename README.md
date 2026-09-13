# STUDY PREMIUM COURSE — Full Working Project

A production-ready starter for a paid education platform with:

- Responsive dark/gold student website
- Course → semester → batch → subject → unit → content hierarchy
- Manual UPI/QR payment with UTR submission and admin approval
- Admin dashboard for courses, batches, content and payments
- MongoDB Atlas persistence
- Private Backblaze B2 storage integration with short-lived signed URLs
- Telegram deep-link access and optional Telegram webhook delivery
- User purchase/access control
- Vercel / Render / Cloudflare deployment configuration and docs
- No Gmail, OTP or phone-login requirement

## 1. Local run

1. Install Node.js 20+.
2. Copy `.env.example` to `.env` and fill MongoDB + admin values.
3. Run `npm install`.
4. Run `npm run seed` once.
5. Run `npm start`.
6. Open `http://localhost:10000`.

Default seed admin is read from `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## 2. Real services required

The code is fully wired for the services, but credentials cannot be embedded in a ZIP. You must add your own:

- MongoDB Atlas URI
- Backblaze B2 S3 credentials/bucket
- Telegram bot token + username (optional until bot is configured)
- UPI ID / QR image for manual payment
- Strong JWT secret

See `docs/DEPLOYMENT.md` and `docs/TELEGRAM.md`.

## 3. Payment model

The QR/UPI payment is intentionally manual: a buyer submits name, email, mobile and UTR. The order stays `PENDING` until an admin approves it. Approval creates an entitlement. No screenshot or client-side flag can unlock a paid batch.

## 4. Storage

Admin can upload video/PDF files through the admin panel when B2 is configured. Files are stored privately. Students receive short-lived signed URLs or Telegram delivery after entitlement checks.

## 5. Important

Do not commit `.env` or real API keys to GitHub.
