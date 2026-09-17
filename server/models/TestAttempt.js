import mongoose from 'mongoose';
const schema=new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  content:{type:mongoose.Schema.Types.ObjectId,ref:'Content',required:true},
  course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},
  answers:{type:[Number],default:[]}, score:{type:Number,default:0}, total:{type:Number,default:0}, submittedAt:{type:Date,default:Date.now}
},{timestamps:true});
schema.index({user:1,content:1,createdAt:-1});
export default mongoose.model('TestAttempt',schema);
