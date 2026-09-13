# Telegram setup

1. Create a bot with BotFather and copy the token.
2. Set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_BOT_USERNAME`.
3. Configure Telegram webhook to `https://YOUR-DOMAIN/api/telegram/webhook`.
4. The website can open a Telegram deep link after an approved entitlement.
5. Telegram cannot silently press Start for the user. The user must tap Start once.
6. For production file delivery, extend the webhook to map a signed one-time token to the approved user/course and call `sendVideo` / `sendDocument` with a short-lived B2 URL.

Never put the bot token in frontend JavaScript.
