import mongoose from 'mongoose';
const schema=new mongoose.Schema({course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},title:{type:String,required:true},unit:String,teacher:String,startsAt:Date,joinUrl:String,status:{type:String,enum:['UPCOMING','LIVE','ENDED'],default:'UPCOMING'},thumbnail:String},{timestamps:true});
export default mongoose.model('LiveClass',schema);
