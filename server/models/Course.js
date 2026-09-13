import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},slug:{type:String,unique:true},description:String,branch:String,semester:String,batch:String,price:{type:Number,default:0},thumbnail:String,telegramEnabled:{type:Boolean,default:true},published:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Course',schema);
