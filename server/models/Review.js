import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},rating:{type:Number,min:1,max:5,required:true},text:{type:String,required:true},approved:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Review',schema);
