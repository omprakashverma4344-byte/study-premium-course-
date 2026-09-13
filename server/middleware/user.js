import jwt from 'jsonwebtoken';
export function signUser(userId){return jwt.sign({role:'user',userId},process.env.JWT_SECRET,{expiresIn:'30d'});}
export function userAuth(req,res,next){try{const token=req.cookies?.user_token||req.headers.authorization?.replace('Bearer ','');req.user=jwt.verify(token,process.env.JWT_SECRET);if(req.user.role!=='user')throw Error();next();}catch{res.status(401).json({error:'User session required'});}}
