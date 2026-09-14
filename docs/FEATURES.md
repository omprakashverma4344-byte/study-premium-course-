# STUDY PREMIUM COURSE — Working Feature Map

## User
- Browse published courses by branch/semester.
- Course → Purchase → name/email/mobile → QR/UPI → UTR → optional payment screenshot.
- Payment remains PENDING until admin approval.
- Approved order creates an ACTIVE entitlement.
- My Courses and My Orders are database-backed.
- Protected content requires an active entitlement.
- Play / PDF / Save generates a short-lived secure Telegram token.
- Telegram `/start <token>` verifies the token and MongoDB entitlement before sending the selected content.

## Admin
- Dashboard statistics and revenue.
- Courses: add/edit/delete, branch, semester, batch, price, thumbnail URL, publish and Telegram flags.
- Content: video/PDF/link/test, subject, unit, order, B2 upload or external URL.
- Payments: approve/reject/pending.
- Users and Telegram account IDs.
- Entitlements: enable/disable access.
- Live/Upcoming classes: CRUD.
- Banners: CRUD.
- Notifications: CRUD.
- Reviews: approve/hide/delete.
- Website settings: site name, tagline, UPI and Telegram username.

## Storage
Backblaze B2 is supported through its S3-compatible API. For very large video files, use a direct-to-B2 upload flow rather than sending the file through a Vercel function.
