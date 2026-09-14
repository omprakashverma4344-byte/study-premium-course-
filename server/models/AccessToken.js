import mongoose from 'mongoose';
const schema=new mongoose.Schema({token:{type:String,unique:true,index:true},user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},content:{type:mongoose.Schema.Types.ObjectId,ref:'Content'},action:{type:String,enum:['play','pdf','save','course'],default:'course'},expiresAt:{type:Date,required:true}},{timestamps:true});
schema.index({expiresAt:1},{expireAfterSeconds:0});
export default mongoose.model('AccessToken',schema);
