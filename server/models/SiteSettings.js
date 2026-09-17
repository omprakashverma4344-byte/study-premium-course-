import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,unique:true,default:'main'},siteName:{type:String,default:'STUDY PREMIUM COURSE'},tagline:{type:String,default:'LEARN • GROW • SUCCEED'},supportEmail:String,telegramBotUsername:String,upiId:String,upiName:String,paymentQrUrl:String,paymentQrData:String,contactTelegram:String,announcement:String},{timestamps:true});
export default mongoose.model('SiteSettings',schema);
