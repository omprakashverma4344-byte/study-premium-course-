import mongoose from 'mongoose';
const schema=new mongoose.Schema({title:{type:String,required:true},subtitle:String,imageUrl:String,buttonText:String,buttonUrl:String,active:{type:Boolean,default:true},order:{type:Number,default:0}},{timestamps:true});
export default mongoose.model('Banner',schema);
