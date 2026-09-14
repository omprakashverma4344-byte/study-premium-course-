import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},message:{type:String,required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course'},active:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Notification',schema);
