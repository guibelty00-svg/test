import 'dotenv/config';import express from 'express';import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';import multer from 'multer';import path from 'node:path';import fs from 'node:fs/promises';import {v4 as uuid} from 'uuid';import {list,add,update,remove} from './store.js';import {moderateImage,moderateVideo} from './moderation.js';import {adminPage} from './admin-page.js';import {adminClient} from './admin-client.js';
const app=express(),port=Number(process.env.PORT||3000),base=(process.env.PUBLIC_BASE_URL||`http://localhost:${port}`).replace(/\/$/,'');
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
// Railway est placé derrière un proxy inverse. Cette option permet à Express
// et express-rate-limit d'utiliser correctement l'adresse IP du visiteur.
app.set('trust proxy', 1);
app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'cross-origin'}}));app.use(cors({origin:(o,cb)=>!o||!origins.length||origins.includes(o)?cb(null,true):cb(new Error('Origin refusée')),methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization']}));app.options('*',cors());app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:false}));app.use(rateLimit({windowMs:15*60*1000,limit:120}));
const uploadDir=path.resolve('data/uploads'),publicDir=path.resolve('data/public');await fs.mkdir(uploadDir,{recursive:true});await fs.mkdir(publicDir,{recursive:true});
app.use('/media',express.static(publicDir,{maxAge:'7d'}));
const max=Number(process.env.MAX_UPLOAD_MB||100)*1024*1024;const upload=multer({dest:uploadDir,limits:{fileSize:max},fileFilter:(req,file,cb)=>cb(null,['image/jpeg','image/png','image/webp','video/mp4','video/quicktime'].includes(file.mimetype))});
app.get('/',(req,res)=>res.json({name:'Rasso.69 Media Hub',ok:true,health:'/health',admin:'/admin'}));app.get('/admin',(req,res)=>res.set('Cache-Control','no-store').type('html').send(adminPage));app.get('/admin.js',(req,res)=>res.set('Cache-Control','no-store').type('application/javascript').send(adminClient));app.get('/health',(req,res)=>res.json({ok:true}));

// Compteur de visiteurs connectés. Un navigateur envoie un battement régulier ;
// il reste compté pendant 55 secondes après son dernier signal.
const activeMembers = new Map();
const PRESENCE_TTL_MS = 55 * 1000;
function cleanPresence() {
  const cutoff = Date.now() - PRESENCE_TTL_MS;
  for (const [visitorId, lastSeen] of activeMembers.entries()) {
    if (lastSeen < cutoff) activeMembers.delete(visitorId);
  }
}
function presenceCount() {
  cleanPresence();
  return activeMembers.size;
}
app.post('/api/presence/heartbeat', (req, res) => {
  const visitorId = String(req.body?.visitorId || '').trim().slice(0, 100);
  if (!visitorId || !/^[a-zA-Z0-9_-]+$/.test(visitorId)) {
    return res.status(400).json({ error: 'Identifiant visiteur invalide' });
  }
  activeMembers.set(visitorId, Date.now());
  return res.json({ count: presenceCount(), label: 'ADV MEMBER' });
});
app.get('/api/presence', (req, res) => res.json({ count: presenceCount(), label: 'ADV MEMBER' }));
app.get('/api/media',async(req,res)=>{const rows=await list(req.query.status||'approved');res.json({items:rows.map(x=>({...x,url:x.url.startsWith('http')?x.url:base+x.url,thumbnailUrl:x.thumbnailUrl?base+x.thumbnailUrl:null}))})});
app.post('/api/uploads',rateLimit({windowMs:60*60*1000,limit:12}),upload.single('media'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'Fichier manquant'});if(!req.body.consent)return res.status(400).json({error:'Consentement requis'});const id=uuid(),isVideo=req.file.mimetype.startsWith('video/'),ext=isVideo?'.mp4':'.jpg',out=path.join(publicDir,id+ext);let moderation;if(isVideo){await fs.copyFile(req.file.path,out);moderation=await moderateVideo(req.file.path)}else moderation=await moderateImage(req.file.path,out);await fs.unlink(req.file.path).catch(()=>{});const status=moderation.decision==='rejected'?'rejected':'pending';const item=await add({id,type:isVideo?'video':'image',author:String(req.body.author||'').slice(0,60),caption:String(req.body.caption||'').slice(0,300),url:'/media/'+id+ext,status,featured:false,likes:0,moderation,createdAt:new Date().toISOString()});if(status==='rejected')return res.status(422).json({error:'Ce contenu ne peut pas être accepté.',id:item.id});res.status(201).json({message:'Contenu reçu. Il sera visible après validation par Rasso.69.',id:item.id,status})}catch(e){console.error(e);res.status(500).json({error:'Erreur pendant le traitement du média'})}});
function admin(req,res,next){if(!process.env.ADMIN_TOKEN||req.headers.authorization!==`Bearer ${process.env.ADMIN_TOKEN}`)return res.status(401).json({error:'Non autorisé'});next()}
app.get('/api/admin/media',admin,async(req,res)=>res.json({items:await list(req.query.status)}));
app.patch('/api/admin/media/:id',admin,async(req,res)=>{try{const body=req.body&&typeof req.body==='object'?req.body:{};const allowed={};if(Object.prototype.hasOwnProperty.call(body,'status')){if(!['pending','approved','rejected'].includes(body.status))return res.status(400).json({error:'Statut invalide'});allowed.status=body.status;}if(Object.prototype.hasOwnProperty.call(body,'featured'))allowed.featured=Boolean(body.featured);if(Object.prototype.hasOwnProperty.call(body,'caption'))allowed.caption=String(body.caption||'').slice(0,300);if(Object.prototype.hasOwnProperty.call(body,'author'))allowed.author=String(body.author||'').slice(0,60);if(!Object.keys(allowed).length)return res.status(400).json({error:'Aucune modification reçue'});const item=await update(req.params.id,allowed);return item?res.json(item):res.status(404).json({error:'Introuvable'});}catch(error){console.error('Erreur mise à jour média',error);return res.status(500).json({error:'Impossible de mettre à jour ce contenu'});}});

app.post('/api/admin/media/:id/action',admin,async(req,res)=>{try{const action=String(req.body?.action||'');let item;if(action==='approve')item=await update(req.params.id,{status:'approved'});else if(action==='reject')item=await update(req.params.id,{status:'rejected'});else if(action==='feature')item=await update(req.params.id,{featured:Boolean(req.body?.featured)});else if(action==='delete'){item=await remove(req.params.id);if(item?.url?.startsWith('/media/'))await fs.unlink(path.join(publicDir,path.basename(item.url))).catch(()=>{});}else return res.status(400).json({error:'Action inconnue'});if(!item)return res.status(404).json({error:'Contenu introuvable'});return res.json({ok:true,item});}catch(error){console.error('ADMIN ACTION ERROR',error);return res.status(500).json({error:error?.message||'Erreur interne pendant l’action'});}});
app.delete('/api/admin/media/:id',admin,async(req,res)=>{const item=await remove(req.params.id);if(!item)return res.status(404).json({error:'Introuvable'});if(item.url?.startsWith('/media/'))await fs.unlink(path.join(publicDir,path.basename(item.url))).catch(()=>{});res.json({ok:true})});
app.use((err,req,res,next)=>{console.error('REQUEST ERROR',err);const status=err.code==='LIMIT_FILE_SIZE'?413:(err.status||400);res.status(status).json({error:err.code==='LIMIT_FILE_SIZE'?'Fichier trop volumineux':(err.message||'Requête invalide')});});
app.listen(port,'0.0.0.0',()=>console.log(`Rasso.69 Media Hub : ${base}`));
