export async function telegram(method,body){
  if(!process.env.TELEGRAM_BOT_TOKEN)throw new Error('Telegram bot is not configured');
  const r=await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.ok)throw new Error(data.description||`Telegram API error (${r.status})`);
  return data;
}
export function deepLink(payload){
  if(!process.env.TELEGRAM_BOT_USERNAME)return null;
  return `https://t.me/${String(process.env.TELEGRAM_BOT_USERNAME).replace(/^@/,'')}?start=${encodeURIComponent(payload)}`;
}
