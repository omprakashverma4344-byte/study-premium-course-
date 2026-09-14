import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import mongoose from 'mongoose';
import multer from 'multer';
import {nanoid} from 'nanoid';
import User from './models/User.js';
import Course from './models/Course.js';
import Content from './models/Content.js';
import Order from './models/Order.js';
import Entitlement from './models/Entitlement.js';
import AccessToken from './models/AccessToken.js';
import LiveClass from './models/LiveClass.js';
import Review from './models/Review.js';
import Notification from './models/Notification.js';
import Banner from './models/Banner.js';
import SiteSettings from './models/SiteSettings.js';
import {adminAuth,signAdmin} from './middleware/auth.js';
import {userAuth,signUser} from './middleware/user.js';
import {uploadToB2} from './services/b2.js';
import {telegram,deepLink} from './services/telegram.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.use(cors({origin:true,credentials:true}));
app.use(express.json({limit:'2mb'}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname,'../public')));
const upload=multer({dest:'/tmp/uploads',limits:{fileSize:1024*1024*1024}});

const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const cookieOpts={httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production'};

app.get('/api/health',(req,res)=>res.json({ok:true,database:mongoose.connection.readyState===1?'connected':'not_connected'}));
app.get('/api/config',asyncRoute(async(req,res)=>{const s=await SiteSettings.findOne({key:'main'}).lean();res.json({upiId:s?.upiId||process.env.UPI_ID||'',upiName:s?.upiName||process.env.UPI_NAME||'STUDY PREMIUM COURSE',telegramConfigured:!!(s?.telegramBotUsername||process.env.TELEGRAM_BOT_USERNAME),siteName:s?.siteName||'STUDY PREMIUM COURSE',tagline:s?.tagline||'LEARN • GROW • SUCCEED'});}));

app.post('/api/auth/user',asyncRoute(async(req,res)=>{const {name,email,mobile}=req.body||{};if(!name||!email)return res.status(400).json({error:'Name and email are required'});const normalized=email.trim().toLowerCase();let u=await User.findOne({email:normalized});if(u){u.name=name.trim();if(mobile)u.mobile=mobile.trim();await u.save();}else u=await User.create({name:name.trim(),email:normalized,mobile});res.cookie('user_token',signUser(u._id.toString()),{...cookieOpts,maxAge:30*864e5});res.json({user:{id:u._id,name:u.name,email:u.email,mobile:u.mobile}});}));
app.get('/api/me',userAuth,asyncRoute(async(req,res)=>res.json({user:await User.findById(req.user.userId)})));

app.get('/api/courses',asyncRoute(async(req,res)=>{const q={published:true};if(req.query.branch)q.branch=req.query.branch;if(req.query.semester)q.semester=req.query.semester;res.json(await Course.find(q).sort({createdAt:-1}));}));
app.get('/api/courses/:id',asyncRoute(async(req,res)=>{const c=await Course.findById(req.params.id);if(!c)return res.status(404).json({error:'Course not found'});res.json(c);}));
app.get('/api/courses/:id/content',userAuth,asyncRoute(async(req,res)=>{const access=await Entitlement.findOne({user:req.user.userId,course:req.params.id,active:true});if(!access)return res.status(403).json({error:'Purchase approval required'});res.json(await Content.find({course:req.params.id,published:true}).sort({subject:1,unit:1,order:1}));}));
app.get('/api/content/:id/access',userAuth,asyncRoute(async(req,res)=>{const item=await Content.findById(req.params.id);if(!item)return res.status(404).json({error:'Content not found'});const access=await Entitlement.findOne({user:req.user.userId,course:item.course,active:true});if(!access)return res.status(403).json({error:'Access denied'});res.json({delivery:'telegram',contentId:item._id,telegramFileConfigured:!!item.telegramFileId,externalUrl:item.externalUrl||null});}));

app.post('/api/orders',upload.single('paymentProof'),asyncRoute(async(req,res)=>{const {name,email,mobile,courseId,utr}=req.body||{};if(!name||!email||!courseId||!utr)return res.status(400).json({error:'Name, email, course and UTR are required'});const c=await Course.findById(courseId);if(!c)return res.status(404).json({error:'Course not found'});const normalized=email.trim().toLowerCase();let u=await User.findOne({email:normalized});if(!u)u=await User.create({name,email:normalized,mobile});else{u.name=name;u.mobile=mobile||u.mobile;await u.save();}if(await Order.findOne({utr:utr.trim()}))return res.status(409).json({error:'This UTR has already been submitted'});let paymentProofUrl='';if(req.file)paymentProofUrl=await uploadToB2(req.file,`payments/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')}`);const o=await Order.create({user:u._id,course:c._id,amount:c.price,utr:utr.trim(),paymentProofUrl,status:'PENDING'});res.cookie('user_token',signUser(u._id.toString()),{...cookieOpts,maxAge:30*864e5});res.json({ok:true,orderId:o._id,status:o.status,message:'Payment submitted. Access unlocks only after admin approval.'});}));
app.get('/api/my-courses',userAuth,asyncRoute(async(req,res)=>res.json(await Entitlement.find({user:req.user.userId,active:true}).populate('course'))));
app.get('/api/orders/mine',userAuth,asyncRoute(async(req,res)=>res.json(await Order.find({user:req.user.userId}).populate('course').sort({createdAt:-1}))));
app.get('/api/live',asyncRoute(async(req,res)=>res.json(await LiveClass.find({status:{$in:['LIVE','UPCOMING']}}).populate('course').sort({startsAt:1}))));
app.get('/api/banners',asyncRoute(async(req,res)=>res.json(await Banner.find({active:true}).sort({order:1,createdAt:-1}))));
app.get('/api/notifications',asyncRoute(async(req,res)=>res.json(await Notification.find({active:true}).populate('course').sort({createdAt:-1}).limit(50))));
app.get('/api/courses/:id/reviews',asyncRoute(async(req,res)=>res.json(await Review.find({course:req.params.id,approved:true}).populate('user','name').sort({createdAt:-1}))));
app.post('/api/courses/:id/reviews',userAuth,asyncRoute(async(req,res)=>{const {rating,text}=req.body||{};const ent=await Entitlement.findOne({user:req.user.userId,course:req.params.id,active:true});if(!ent)return res.status(403).json({error:'Purchase approval required'});if(!rating||!text)return res.status(400).json({error:'Rating and review are required'});res.json(await Review.create({user:req.user.userId,course:req.params.id,rating,text}));}));

app.get('/api/telegram/link/:courseId',userAuth,asyncRoute(async(req,res)=>{const access=await Entitlement.findOne({user:req.user.userId,course:req.params.courseId,active:true});if(!access)return res.status(403).json({error:'Approve purchase first'});const token='access_'+nanoid(14);await AccessToken.create({token,user:req.user.userId,course:req.params.courseId,action:'course',expiresAt:new Date(Date.now()+10*60*1000)});res.json({url:deepLink(token),token});}));
app.get('/api/telegram/link/:courseId/:contentId/:action',userAuth,asyncRoute(async(req,res)=>{const access=await Entitlement.findOne({user:req.user.userId,course:req.params.courseId,active:true});if(!access)return res.status(403).json({error:'Approve purchase first'});if(!['play','pdf','save'].includes(req.params.action))return res.status(400).json({error:'Invalid action'});const item=await Content.findOne({_id:req.params.contentId,course:req.params.courseId,published:true});if(!item)return res.status(404).json({error:'Content not found'});const token='access_'+nanoid(14);await AccessToken.create({token,user:req.user.userId,course:req.params.courseId,content:item._id,action:req.params.action,expiresAt:new Date(Date.now()+10*60*1000)});res.json({url:deepLink(token),token});}));

app.post('/api/telegram/webhook',asyncRoute(async(req,res)=>{
  const msg=req.body?.message;
  const callback=req.body?.callback_query;
  if(callback){await handleTelegramCallback(callback);return res.json({ok:true});}
  if(!msg)return res.json({ok:true});
  const chatId=String(msg.chat.id);
  const adminChatId=String(process.env.ADMIN_TELEGRAM_CHAT_ID||'');

  // Admin file collector: send a video/PDF to the bot and it returns the Telegram file_id.
  if((msg.video||msg.document) && adminChatId && chatId===adminChatId){
    const fileId=msg.video?.file_id||msg.document?.file_id;
    const kind=msg.video?'VIDEO':'DOCUMENT';
    await telegram('sendMessage',{chat_id:chatId,text:`✅ ${kind} received\n\nTelegram File ID:\n\`${fileId}\`\n\nPaste this File ID into Admin → Videos / PDFs.` ,parse_mode:'Markdown'});
    return res.json({ok:true});
  }

  if(msg.text==='/myid'){
    return telegram('sendMessage',{chat_id:chatId,text:`Your Telegram Chat ID: ${chatId}`}).then(()=>res.json({ok:true}));
  }

  if(!msg.text?.startsWith('/start'))return res.json({ok:true});
  const token=msg.text.split(' ')[1]||'';
  const access=await AccessToken.findOne({token,expiresAt:{$gt:new Date()}}).populate('course').populate('content');
  if(!access)return telegram('sendMessage',{chat_id:chatId,text:'❌ Access link expired or invalid. Open the website again.'}).then(()=>res.json({ok:true}));

  const user=await User.findById(access.user);
  if(!user)return telegram('sendMessage',{chat_id:chatId,text:'❌ User account not found.'}).then(()=>res.json({ok:true}));
  if(user.telegramChatId && String(user.telegramChatId)!==chatId){
    return telegram('sendMessage',{chat_id:chatId,text:'🚫 This purchase is already linked to another Telegram account.'}).then(()=>res.json({ok:true}));
  }

  const ent=await Entitlement.findOne({user:access.user,course:access.course._id,active:true});
  if(!ent)return telegram('sendMessage',{chat_id:chatId,text:'🚫 ACCESS DENIED\nYour payment is not approved for this batch.'}).then(()=>res.json({ok:true}));

  user.telegramChatId=chatId;
  await user.save();
  access.expiresAt=new Date(Date.now()+24*60*60*1000);
  await access.save();

  if(access.content){await sendTelegramContent(chatId,access.content,access.action);return res.json({ok:true});}
  await telegram('sendMessage',{chat_id:chatId,text:`✅ Purchase verified\n\n${access.course.title}\n\nNow return to the website and choose Play / PDF / Save for the exact content you want.`});
  return res.json({ok:true});
}));
async function sendTelegramContent(chatId,item,action='play'){
  if(item.type==='pdf'||action==='pdf'){
    if(item.telegramFileId)return telegram('sendDocument',{chat_id:chatId,document:item.telegramFileId,caption:`📄 ${item.title}`});
    if(item.externalUrl)return telegram('sendMessage',{chat_id:chatId,text:`📄 ${item.title}\n${item.externalUrl}`});
  }
  if(item.type==='video'||action==='play'||action==='save'){
    if(item.telegramFileId)return telegram('sendVideo',{chat_id:chatId,video:item.telegramFileId,caption:`▶ ${item.title}`});
    if(item.externalUrl)return telegram('sendMessage',{chat_id:chatId,text:`▶ ${item.title}\n${item.externalUrl}`});
  }
  if(item.externalUrl)return telegram('sendMessage',{chat_id:chatId,text:`${item.title}\n${item.externalUrl}`});
  return telegram('sendMessage',{chat_id:chatId,text:'⚠️ This content is not configured yet.'});
}
async function handleTelegramCallback(cb){const data=cb.data||'';const [prefix,token,contentId,action]=data.split('|');if(prefix!=='content')return;const access=await AccessToken.findOne({token,expiresAt:{$gt:new Date()}});const chatId=String(cb.message.chat.id);if(!access){await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:'Access expired',show_alert:true});return;}const ent=await Entitlement.findOne({user:access.user,course:access.course,active:true});if(!ent){await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:'Access denied',show_alert:true});return;}const item=await Content.findById(contentId);if(item)await sendTelegramContent(chatId,item,action);await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:'Verified'});}

// TELEGRAM ADMIN HELPERS
app.get('/api/admin/telegram/status',adminAuth,asyncRoute(async(req,res)=>{
  const configured=!!process.env.TELEGRAM_BOT_TOKEN;
  let bot=null;
  if(configured){try{bot=(await telegram('getMe',{})).result;}catch(e){return res.status(400).json({configured:true,ok:false,error:e.message});}}
  res.json({configured,ok:!!bot,bot:bot?{id:bot.id,username:bot.username,name:bot.first_name}:null,adminChatConfigured:!!process.env.ADMIN_TELEGRAM_CHAT_ID});
}));
app.post('/api/admin/telegram/set-webhook',adminAuth,asyncRoute(async(req,res)=>{
  const base=String(process.env.APP_URL||'').replace(/\/$/,'');
  if(!base)return res.status(400).json({error:'APP_URL is missing'});
  const url=base+'/api/telegram/webhook';
  res.json(await telegram('setWebhook',{url,drop_pending_updates:true}));
}));
app.post('/api/admin/telegram/delete-webhook',adminAuth,asyncRoute(async(req,res)=>res.json(await telegram('deleteWebhook',{drop_pending_updates:true}))));

// ADMIN
app.post('/api/admin/login',asyncRoute(async(req,res)=>{const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');const expected=String(process.env.ADMIN_EMAIL||'').trim().toLowerCase();if(!expected||!process.env.ADMIN_PASSWORD||!process.env.JWT_SECRET)return res.status(500).json({error:'Admin environment variables are not configured'});if(email!==expected||!(await bcrypt.compare(password,await bcrypt.hash(process.env.ADMIN_PASSWORD,10))))return res.status(401).json({error:'Invalid credentials'});res.cookie('admin_token',signAdmin(expected),{...cookieOpts,maxAge:7*864e5});res.json({ok:true});}));
app.post('/api/admin/logout',adminAuth,(req,res)=>{res.clearCookie('admin_token',{...cookieOpts,maxAge:0});res.json({ok:true});});
app.get('/api/admin/me',adminAuth,(req,res)=>res.json({admin:req.admin}));
app.get('/api/admin/stats',adminAuth,asyncRoute(async(req,res)=>{const revenue=(await Order.aggregate([{$match:{status:'APPROVED'}},{$group:{_id:null,total:{$sum:'$amount'}}}]))[0]?.total||0;res.json({courses:await Course.countDocuments(),users:await User.countDocuments(),orders:await Order.countDocuments(),pending:await Order.countDocuments({status:'PENDING'}),approved:await Order.countDocuments({status:'APPROVED'}),entitlements:await Entitlement.countDocuments({active:true}),content:await Content.countDocuments(),live:await LiveClass.countDocuments({status:'LIVE'}),revenue});}));
app.get('/api/admin/orders',adminAuth,asyncRoute(async(req,res)=>res.json(await Order.find().populate('user course').sort({createdAt:-1}))));
app.patch('/api/admin/orders/:id',adminAuth,asyncRoute(async(req,res)=>{const {status,note}=req.body||{};if(!['APPROVED','REJECTED','PENDING'].includes(status))return res.status(400).json({error:'Invalid status'});const o=await Order.findById(req.params.id);if(!o)return res.status(404).json({error:'Order not found'});o.status=status;o.note=note||'';o.approvedAt=status==='APPROVED'?new Date():undefined;await o.save();if(status==='APPROVED')await Entitlement.findOneAndUpdate({user:o.user,course:o.course},{user:o.user,course:o.course,order:o._id,active:true},{upsert:true,new:true});else if(status==='REJECTED')await Entitlement.updateOne({user:o.user,course:o.course},{active:false});res.json(o);}));
app.get('/api/admin/courses',adminAuth,asyncRoute(async(req,res)=>res.json(await Course.find().sort({createdAt:-1}))));
app.post('/api/admin/courses',adminAuth,asyncRoute(async(req,res)=>{const data={...req.body};data.price=Number(data.price||0);data.published=data.published!==false;data.telegramEnabled=data.telegramEnabled!==false;data.slug=data.slug||data.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+nanoid(5).toLowerCase();res.json(await Course.create(data));}));
app.put('/api/admin/courses/:id',adminAuth,asyncRoute(async(req,res)=>{const data={...req.body};if(data.price!==undefined)data.price=Number(data.price);res.json(await Course.findByIdAndUpdate(req.params.id,data,{new:true,runValidators:true}));}));
app.delete('/api/admin/courses/:id',adminAuth,asyncRoute(async(req,res)=>{await Content.deleteMany({course:req.params.id});await Entitlement.deleteMany({course:req.params.id});await Review.deleteMany({course:req.params.id});await LiveClass.deleteMany({course:req.params.id});await Course.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/content',adminAuth,asyncRoute(async(req,res)=>res.json(await Content.find().populate('course').sort({createdAt:-1}))));
app.post('/api/admin/content',adminAuth,asyncRoute(async(req,res)=>{const data={course:req.body.course,subject:req.body.subject,unit:req.body.unit||'Unit 1',title:req.body.title,type:req.body.type||'video',telegramFileId:req.body.telegramFileId?.trim()||'',externalUrl:req.body.externalUrl?.trim()||'',order:Number(req.body.order||0),published:req.body.published!=='false'};if(['video','pdf'].includes(data.type)&&!data.telegramFileId&&!data.externalUrl)return res.status(400).json({error:'Telegram File ID is required for video/PDF content'});res.json(await Content.create(data));}));
app.put('/api/admin/content/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await Content.findByIdAndUpdate(req.params.id,req.body,{new:true,runValidators:true}))));
app.delete('/api/admin/content/:id',adminAuth,asyncRoute(async(req,res)=>{await Content.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/users',adminAuth,asyncRoute(async(req,res)=>res.json(await User.find().sort({createdAt:-1}))));
app.get('/api/admin/entitlements',adminAuth,asyncRoute(async(req,res)=>res.json(await Entitlement.find().populate('user course order').sort({createdAt:-1}))));
app.patch('/api/admin/entitlements/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await Entitlement.findByIdAndUpdate(req.params.id,{active:!!req.body.active},{new:true}))));
app.get('/api/admin/live',adminAuth,asyncRoute(async(req,res)=>res.json(await LiveClass.find().populate('course').sort({startsAt:1}))));
app.post('/api/admin/live',adminAuth,asyncRoute(async(req,res)=>res.json(await LiveClass.create({...req.body,startsAt:req.body.startsAt?new Date(req.body.startsAt):undefined}))));
app.put('/api/admin/live/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await LiveClass.findByIdAndUpdate(req.params.id,{...req.body,startsAt:req.body.startsAt?new Date(req.body.startsAt):undefined},{new:true}))));
app.delete('/api/admin/live/:id',adminAuth,asyncRoute(async(req,res)=>{await LiveClass.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/banners',adminAuth,asyncRoute(async(req,res)=>res.json(await Banner.find().sort({order:1,createdAt:-1}))));
app.post('/api/admin/banners',adminAuth,asyncRoute(async(req,res)=>res.json(await Banner.create({...req.body,order:Number(req.body.order||0),active:req.body.active!=='false'}))));
app.put('/api/admin/banners/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await Banner.findByIdAndUpdate(req.params.id,req.body,{new:true}))));
app.delete('/api/admin/banners/:id',adminAuth,asyncRoute(async(req,res)=>{await Banner.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/notifications',adminAuth,asyncRoute(async(req,res)=>res.json(await Notification.find().populate('course').sort({createdAt:-1}))));
app.post('/api/admin/notifications',adminAuth,asyncRoute(async(req,res)=>res.json(await Notification.create(req.body))));
app.put('/api/admin/notifications/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await Notification.findByIdAndUpdate(req.params.id,req.body,{new:true}))));
app.delete('/api/admin/notifications/:id',adminAuth,asyncRoute(async(req,res)=>{await Notification.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/reviews',adminAuth,asyncRoute(async(req,res)=>res.json(await Review.find().populate('user course').sort({createdAt:-1}))));
app.patch('/api/admin/reviews/:id',adminAuth,asyncRoute(async(req,res)=>res.json(await Review.findByIdAndUpdate(req.params.id,{approved:!!req.body.approved},{new:true}))));
app.delete('/api/admin/reviews/:id',adminAuth,asyncRoute(async(req,res)=>{await Review.findByIdAndDelete(req.params.id);res.json({ok:true});}));
app.get('/api/admin/settings',adminAuth,asyncRoute(async(req,res)=>res.json(await SiteSettings.findOne({key:'main'})||await SiteSettings.create({key:'main'}))));
app.put('/api/admin/settings',adminAuth,asyncRoute(async(req,res)=>res.json(await SiteSettings.findOneAndUpdate({key:'main'},req.body,{upsert:true,new:true,setDefaultsOnInsert:true}))));
app.get('/api/admin/branches',adminAuth,asyncRoute(async(req,res)=>res.json(await Course.distinct('branch'))));
app.get('/api/admin/semesters',adminAuth,asyncRoute(async(req,res)=>res.json(await Course.distinct('semester'))));

app.use((err,req,res,next)=>{console.error(err);if(res.headersSent)return next(err);res.status(500).json({error:err.message||'Server error'});});
app.use((req,res)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'API endpoint not found',path:req.path});res.sendFile(path.join(__dirname,'../public/index.html'));});

export default app;
if(!process.env.VERCEL){const port=Number(process.env.PORT||10000);mongoose.connect(process.env.MONGODB_URI||'').then(()=>app.listen(port,()=>console.log(`STUDY PREMIUM COURSE running on ${port}`))).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});}
