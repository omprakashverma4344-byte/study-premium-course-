import mongoose from 'mongoose';
const schema=new mongoose.Schema({course:{type:mongoose.Schema.Types.ObjectId,ref:'Course',required:true},subject:{type:String,required:true},unit:{type:String,default:'Unit 1'},title:{type:String,required:true},type:{type:String,enum:['video','pdf','link','test'],default:'video'},storageKey:String,externalUrl:String,telegramFileId:String,order:{type:Number,default:0},published:{type:Boolean,default:true}},{timestamps:true});
export default mongoose.model('Content',schema);
