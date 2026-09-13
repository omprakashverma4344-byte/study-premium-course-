import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},order:{type:mongoose.Schema.Types.ObjectId,ref:'Order',required:true},active:{type:Boolean,default:true}},{timestamps:true});
schema.index({user:1,course:1},{unique:true});
export default mongoose.model('Entitlement',schema);
