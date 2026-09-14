# Telegram video/PDF delivery

## Architecture
The website does not store course videos or PDFs. Store them in the Telegram bot by sending the files to the bot from the configured admin Telegram account. The bot returns the Telegram `file_id`; save that ID in Admin → Videos / PDFs.

## Vercel environment variables
- `TELEGRAM_BOT_TOKEN` — BotFather token
- `TELEGRAM_BOT_USERNAME` — bot username without `@`
- `ADMIN_TELEGRAM_CHAT_ID` — admin Telegram chat ID
- `APP_URL` — deployed Vercel URL, for example `https://study-premium-course.vercel.app`

## Setup
1. Create the bot with BotFather.
2. Set the four variables in Vercel.
3. Log in to `/admin`.
4. Open Telegram in the admin account and send `/myid` to the bot. Put the returned chat ID into `ADMIN_TELEGRAM_CHAT_ID` and redeploy if it was not already set.
5. In Admin → Telegram click **Set Webhook**.
6. Send a video or PDF to the bot from the admin Telegram account. The bot replies with the file ID.
7. Add the course/subject/unit/title/type and paste that file ID in Admin → Videos / PDFs.

## User delivery
Website → Play/PDF/Save → secure one-time token → Telegram bot → entitlement check → requested Telegram file.

The first successful `/start <token>` binds the purchased website account to that Telegram chat ID. A different Telegram account cannot use the same linked account.

Telegram cannot silently press Start for a user. The user must tap **Start** the first time.
