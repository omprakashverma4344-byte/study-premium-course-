import {S3Client,PutObjectCommand,GetObjectCommand} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import fs from 'node:fs';
let client;
function getClient(){if(!process.env.B2_ENDPOINT||!process.env.B2_KEY_ID||!process.env.B2_APPLICATION_KEY)return null;client ||= new S3Client({endpoint:process.env.B2_ENDPOINT,region:process.env.B2_REGION||'us-east-005',credentials:{accessKeyId:process.env.B2_KEY_ID,secretAccessKey:process.env.B2_APPLICATION_KEY},forcePathStyle:true});return client;}
export async function uploadToB2(file,key){const c=getClient();if(!c)throw new Error('Backblaze B2 is not configured');await c.send(new PutObjectCommand({Bucket:process.env.B2_BUCKET,Key:key,Body:fs.createReadStream(file.path),ContentType:file.mimetype}));return key;}
export async function signedB2Url(key,seconds=300){const c=getClient();if(!c)throw new Error('Backblaze B2 is not configured');return getSignedUrl(c,new GetObjectCommand({Bucket:process.env.B2_BUCKET,Key:key}),{expiresIn:seconds});}
