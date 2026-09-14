import mongoose from 'mongoose';
const schema=new mongoose.Schema({key:{type:String,unique:true,default:'main'},siteName:{type:String,default:'STUDY PREMIUM COURSE'},tagline:{type:String,default:'LEARN • GROW • SUCCEED'},supportEmail:String,telegramBotUsername:String,upiId:String,upiName:String});
export default mongoose.model('SiteSettings',schema);
