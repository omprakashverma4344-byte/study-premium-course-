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
import {adminAuth,signAdmin} from './middleware/auth.js';
import {userAuth,signUser} from './middleware/user.js';
import {uploadToB2,signedB2Url} from './services/b2.js';
import {telegram,deepLink} from './services/telegram.js';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
app.use(cors({origin:process.env.FRONTEND_ORIGIN?.split(',')||true,credentials:true}));
app.use(express.json({limit:'2mb'}));app.use(cookieParser());
app.use(express.static(path.join(__dirname,'../public')));
const upload=multer({dest:path.join(__dirname,'../uploads'),limits:{fileSize:1024*1024*1024}});

app.get('/api/health',(req,res)=>res.json({ok:true,database:mongoose.connection.readyState===1?'connected':'not_connected'}));
app.get('/api/config',(req,res)=>res.json({upiId:process.env.UPI_ID||'',upiName:process.env.UPI_NAME||'STUDY PREMIUM COURSE',telegramConfigured:!!process.env.TELEGRAM_BOT_USERNAME}));

app.post('/api/auth/user',async(req,res)=>{try{const {name,email,mobile}=req.body;if(!name||!email)return res.status(400).json({error:'Name and email are required'});let u=await User.findOne({email:email.toLowerCase()});if(u){u.name=name;u.mobile=mobile||u.mobile;await u.save();}else u=await User.create({name,email,mobile});res.cookie('user_token',signUser(u._id.toString()),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*864e5});res.json({user:{id:u._id,name:u.name,email:u.email,mobile:u.mobile}});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/me',userAuth,async(req,res)=>{const u=await User.findById(req.user.userId);res.json({user:u});});

app.get('/api/courses',async(req,res)=>{const q={published:true};if(req.query.branch)q.branch=req.query.branch;if(req.query.semester)q.semester=req.query.semester;const courses=await Course.find(q).sort({createdAt:-1});res.json(courses);});
app.get('/api/courses/:id',async(req,res)=>{const c=await Course.findById(req.params.id);if(!c)return res.status(404).json({error:'Course not found'});res.json(c);});
app.get('/api/courses/:id/content',userAuth,async(req,res)=>{const access=await Entitlement.findOne({user:req.user.userId,course:req.params.id,active:true});if(!access)return res.status(403).json({error:'Purchase approval required'});const items=await Content.find({course:req.params.id,published:true}).sort({subject:1,unit:1,order:1});res.json(items);});
app.get('/api/content/:id/access',userAuth,async(req,res)=>{const item=await Content.findById(req.params.id);if(!item)return res.status(404).json({error:'Content not found'});const access=await Entitlement.findOne({user:req.user.userId,course:item.course,active:true});if(!access)return res.status(403).json({error:'Access denied'});if(item.externalUrl)return res.json({url:item.externalUrl});if(item.storageKey)return res.json({url:await signedB2Url(item.storageKey,300)});res.status(400).json({error:'No media URL configured'});});

app.post('/api/orders',async(req,res)=>{try{const {name,email,mobile,courseId,utr}=req.body;if(!name||!email||!courseId||!utr)return res.status(400).json({error:'Name, email, course and UTR are required'});const c=await Course.findById(courseId);if(!c)return res.status(404).json({error:'Course not found'});let u=await User.findOne({email:email.toLowerCase()});if(!u)u=await User.create({name,email,mobile});else{u.name=name;u.mobile=mobile;await u.save();}const exists=await Order.findOne({utr});if(exists)return res.status(409).json({error:'This UTR has already been submitted'});const o=await Order.create({user:u._id,course:c._id,amount:c.price,utr,status:'PENDING'});res.cookie('user_token',signUser(u._id.toString()),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:30*864e5});res.json({ok:true,orderId:o._id,status:o.status,message:'Payment submitted. Access unlocks only after admin approval.'});}catch(e){res.status(500).json({error:e.message});}});
app.get('/api/my-courses',userAuth,async(req,res)=>{const list=await Entitlement.find({user:req.user.userId,active:true}).populate('course');res.json(list);});
app.get('/api/orders/mine',userAuth,async(req,res)=>res.json(await Order.find({user:req.user.userId}).populate('course').sort({createdAt:-1})));
app.get('/api/telegram/link/:courseId',userAuth,async(req,res)=>{const access=await Entitlement.findOne({user:req.user.userId,course:req.params.courseId,active:true});if(!access)return res.status(403).json({error:'Approve purchase first'});const token=nanoid(24);res.json({url:deepLink(`access_${token}`)||null,token});});

app.post('/api/admin/login',async(req,res)=>{const {email,password}=req.body;if(email!==process.env.ADMIN_EMAIL||!(await bcrypt.compare(password,await bcrypt.hash(process.env.ADMIN_PASSWORD||'',10))))return res.status(401).json({error:'Invalid credentials'});res.cookie('admin_token',signAdmin(email),{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:7*864e5});res.json({ok:true});});
app.get('/api/admin/me',adminAuth,(req,res)=>res.json({admin:req.admin}));
app.get('/api/admin/stats',adminAuth,async(req,res)=>{res.json({courses:await Course.countDocuments(),users:await User.countDocuments(),orders:await Order.countDocuments(),pending:await Order.countDocuments({status:'PENDING'}),approved:await Order.countDocuments({status:'APPROVED'}),revenue:(await Order.aggregate([{$match:{status:'APPROVED'}},{$group:{_id:null,total:{$sum:'$amount'}}}]))[0]?.total||0});});
app.get('/api/admin/orders',adminAuth,async(req,res)=>res.json(await Order.find().populate('user course').sort({createdAt:-1})));
app.patch('/api/admin/orders/:id',adminAuth,async(req,res)=>{const {status,note}=req.body;if(!['APPROVED','REJECTED','PENDING'].includes(status))return res.status(400).json({error:'Invalid status'});const o=await Order.findById(req.params.id);if(!o)return res.status(404).json({error:'Order not found'});o.status=status;o.note=note;if(status==='APPROVED')o.approvedAt=new Date();await o.save();if(status==='APPROVED')await Entitlement.findOneAndUpdate({user:o.user,course:o.course},{user:o.user,course:o.course,order:o._id,active:true},{upsert:true,new:true});if(status==='REJECTED')await Entitlement.updateOne({user:o.user,course:o.course},{active:false});res.json(o);});
app.get('/api/admin/courses',adminAuth,async(req,res)=>res.json(await Course.find().sort({createdAt:-1})));
app.post('/api/admin/courses',adminAuth,async(req,res)=>{const data=req.body;data.slug=data.slug||data.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+nanoid(5).toLowerCase();res.json(await Course.create(data));});
app.put('/api/admin/courses/:id',adminAuth,async(req,res)=>res.json(await Course.findByIdAndUpdate(req.params.id,req.body,{new:true})));
app.delete('/api/admin/courses/:id',adminAuth,async(req,res)=>{await Content.deleteMany({course:req.params.id});await Entitlement.deleteMany({course:req.params.id});await Course.findByIdAndDelete(req.params.id);res.json({ok:true});});
app.get('/api/admin/content',adminAuth,async(req,res)=>{res.json(await Content.find().populate('course').sort({createdAt:-1}));});
app.post('/api/admin/content',adminAuth,upload.single('file'),async(req,res)=>{try{const data={course:req.body.course,subject:req.body.subject,unit:req.body.unit,title:req.body.title,type:req.body.type,externalUrl:req.body.externalUrl,order:Number(req.body.order||0)};if(req.file){data.storageKey=await uploadToB2(req.file,`courses/${req.body.course}/${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')}`);}res.json(await Content.create(data));}catch(e){res.status(500).json({error:e.message});}});
app.put('/api/admin/content/:id',adminAuth,async(req,res)=>res.json(await Content.findByIdAndUpdate(req.params.id,req.body,{new:true})));
app.delete('/api/admin/content/:id',adminAuth,async(req,res)=>{await Content.findByIdAndDelete(req.params.id);res.json({ok:true});});

app.post('/api/telegram/webhook',async(req,res)=>{try{const update=req.body;const msg=update.message;if(!msg?.text?.startsWith('/start'))return res.json({ok:true});const payload=msg.text.split(' ')[1]||'';const chatId=String(msg.chat.id);if(payload.startsWith('access_')){await telegram('sendMessage',{chat_id:chatId,text:'Your Telegram access request was received. Open the website account and make sure your purchase is approved. Content is delivered only after entitlement verification.'});}else await telegram('sendMessage',{chat_id:chatId,text:'Welcome to STUDY PREMIUM COURSE. Use the website to purchase a batch, then open Telegram from an approved course.'});res.json({ok:true});}catch(e){res.status(200).json({ok:false,error:e.message});}});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../public/index.html')));
const port=Number(process.env.PORT||10000);
mongoose.connect(process.env.MONGODB_URI||'').then(()=>{app.listen(port,()=>console.log(`STUDY PREMIUM COURSE running on ${port}`));}).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});
