import mongoose from 'mongoose';
const schema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},amount:{type:Number,required:true},utr:{type:String,required:true,trim:true},status:{type:String,enum:['PENDING','APPROVED','REJECTED'],default:'PENDING'},note:String,approvedAt:Date,paymentProofUrl:String},{timestamps:true});
schema.index({utr:1},{unique:true});
export default mongoose.model('Order',schema);
