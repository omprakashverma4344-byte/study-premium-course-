import mongoose from 'mongoose';
const schema=new mongoose.Schema({name:{type:String,required:true,trim:true},email:{type:String,required:true,lowercase:true,trim:true,index:true},mobile:{type:String,trim:true},telegramChatId:String},{timestamps:true});
export default mongoose.model('User',schema);
