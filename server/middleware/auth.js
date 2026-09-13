import jwt from 'jsonwebtoken';
export function signAdmin(email){return jwt.sign({role:'admin',email},process.env.JWT_SECRET,{expiresIn:'7d'});}
export function adminAuth(req,res,next){try{const token=req.cookies?.admin_token||req.headers.authorization?.replace('Bearer ','');const p=jwt.verify(token,process.env.JWT_SECRET);if(p.role!=='admin')throw Error();req.admin=p;next();}catch{res.status(401).json({error:'Admin authentication required'});}}
