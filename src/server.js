import 'dotenv/config';import express from 'express';import cors from 'cors';import helmet from 'helmet';import rateLimit from 'express-rate-limit';import multer from 'multer';import path from 'node:path';import fs from 'node:fs/promises';import {v4 as uuid} from 'uuid';import {list,add,update,mutate,remove,addActivity,listActivity} from './store.js';import {moderateImage,moderateVideo} from './moderation.js';import {adminPage} from './admin-page.js';import {adminClient} from './admin-client.js';
const app=express(),port=Number(process.env.PORT||3000),base=(process.env.PUBLIC_BASE_URL||`http://localhost:${port}`).replace(/\/$/,'');
const origins=(process.env.ALLOWED_ORIGINS||'').split(',').map(x=>x.trim()).filter(Boolean);
// Railway est placé derrière un proxy inverse. Cette option permet à Express
// et express-rate-limit d'utiliser correctement l'adresse IP du visiteur.
app.set('trust proxy', 1);
app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:{policy:'cross-origin'}}));
// Les pages Shopify peuvent être servies depuis plusieurs domaines (aperçu, myshopify, domaine personnalisé).
// L’API communautaire est publique ; les actions d’administration restent protégées par ADMIN_TOKEN.
app.use(cors({origin:true,methods:['GET','POST','PATCH','DELETE','OPTIONS'],allowedHeaders:['Content-Type','Authorization'],credentials:false}));
app.options('*',cors({origin:true}));app.use(express.json({limit:'1mb'}));app.use(express.urlencoded({extended:false}));app.use(rateLimit({windowMs:15*60*1000,limit:120}));
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
function registerPresence(req, res) {
  const visitorId = String(req.query?.id || req.body?.visitorId || '').trim().slice(0, 100);
  if (!visitorId || !/^[a-zA-Z0-9_-]+$/.test(visitorId)) {
    return res.status(400).json({ error: 'Identifiant visiteur invalide' });
  }
  activeMembers.set(visitorId, Date.now());
  res.set('Cache-Control', 'no-store, max-age=0');
  return res.json({ count: presenceCount(), label: 'ADV MEMBER' });
}
// GET évite la requête CORS « preflight » qui peut être bloquée dans l’aperçu Shopify.
app.get('/api/presence/heartbeat', registerPresence);
app.post('/api/presence/heartbeat', registerPresence);
app.get('/api/presence', (req, res) => {
  res.set('Cache-Control', 'no-store, max-age=0');
  res.json({ count: presenceCount(), label: 'ADV MEMBER' });
});
app.get('/api/activity',async(req,res)=>{res.set('Cache-Control','no-store');res.json({items:await listActivity(req.query.limit||15)})});
app.get('/api/stats',async(req,res)=>{const rows=await list('approved');res.set('Cache-Control','no-store');res.json({members:presenceCount(),media:rows.length,likes:rows.reduce((a,x)=>a+Number(x.likes||0),0),votes:rows.reduce((a,x)=>a+Number(x.votes||0),0)})});
// Route unique pour le direct : enregistre le visiteur et renvoie toutes les données en une seule requête.
app.get('/api/live',async(req,res)=>{
  try{
    const visitorId=String(req.query?.id||'').trim().slice(0,100);
    if(visitorId&&/^[a-zA-Z0-9_-]+$/.test(visitorId)) activeMembers.set(visitorId,Date.now());
    const rows=await list('approved');
    const activities=await listActivity(req.query.limit||7);
    res.set('Cache-Control','no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.set('Pragma','no-cache');
    res.json({
      ok:true,
      members:Math.max(visitorId?1:0,presenceCount()),
      media:rows.length,
      likes:rows.reduce((a,x)=>a+Number(x.likes||0),0),
      votes:rows.reduce((a,x)=>a+Number(x.votes||0),0),
      activity:activities,
      serverTime:new Date().toISOString()
    });
  }catch(error){
    console.error('LIVE API ERROR',error);
    res.status(500).json({ok:false,error:'Live momentanément indisponible'});
  }
});
app.get('/api/media',async(req,res)=>{const rows=await list(req.query.status||'approved');res.json({items:rows.map(x=>({...x,url:x.url.startsWith('http')?x.url:base+x.url,thumbnailUrl:x.thumbnailUrl?base+x.thumbnailUrl:null}))})});
app.post('/api/uploads',rateLimit({windowMs:60*60*1000,limit:12}),upload.single('media'),async(req,res)=>{try{if(!req.file)return res.status(400).json({error:'Fichier manquant'});if(!req.body.consent)return res.status(400).json({error:'Consentement requis'});const id=uuid(),isVideo=req.file.mimetype.startsWith('video/'),ext=isVideo?'.mp4':'.jpg',out=path.join(publicDir,id+ext);let moderation;if(isVideo){await fs.copyFile(req.file.path,out);moderation=await moderateVideo(req.file.path)}else moderation=await moderateImage(req.file.path,out);await fs.unlink(req.file.path).catch(()=>{});const status=moderation.decision==='rejected'?'rejected':'pending';const item=await add({id,type:isVideo?'video':'image',author:String(req.body.author||'').slice(0,60),caption:String(req.body.caption||'').slice(0,300),vehicle:String(req.body.vehicle||'').slice(0,80),category:String(req.body.category||'Autre').slice(0,40),url:'/media/'+id+ext,status,featured:false,likes:0,votes:0,views:0,likedBy:[],votedBy:[],moderation,createdAt:new Date().toISOString()});await addActivity({type:'upload',author:item.author,text:`${item.author||'Un membre'} vient d’envoyer un nouveau média`,mediaId:item.id});if(status==='rejected')return res.status(422).json({error:'Ce contenu ne peut pas être accepté.',id:item.id});res.status(201).json({message:'Contenu reçu. Il sera visible après validation par Rasso.69.',id:item.id,status})}catch(e){console.error(e);res.status(500).json({error:'Erreur pendant le traitement du média'})}});

function safeVisitor(req){const id=String(req.body?.visitorId||req.query?.visitorId||'').trim().slice(0,100);return /^[a-zA-Z0-9_-]+$/.test(id)?id:''}
app.post('/api/media/:id/like',async(req,res)=>{const visitor=safeVisitor(req);if(!visitor)return res.status(400).json({error:'Visiteur invalide'});const item=await mutate(req.params.id,x=>{const liked=new Set(x.likedBy||[]);if(liked.has(visitor))liked.delete(visitor);else liked.add(visitor);return {...x,likedBy:[...liked],likes:liked.size}});if(!item||item.status!=='approved')return res.status(404).json({error:'Introuvable'});await addActivity({type:'like',author:'ADV MEMBER',text:`Une publication de ${item.author||'la communauté'} vient de recevoir un like`,mediaId:item.id});res.json({likes:item.likes,liked:item.likedBy.includes(visitor)})});
app.post('/api/media/:id/vote',async(req,res)=>{const visitor=safeVisitor(req);if(!visitor)return res.status(400).json({error:'Visiteur invalide'});const rows=await list('approved');let chosen=null;for(const row of rows){if((row.votedBy||[]).includes(visitor)&&row.id!==req.params.id)await mutate(row.id,x=>{const set=new Set(x.votedBy||[]);set.delete(visitor);return {...x,votedBy:[...set],votes:set.size}})}chosen=await mutate(req.params.id,x=>{const set=new Set(x.votedBy||[]);set.add(visitor);return {...x,votedBy:[...set],votes:set.size}});if(!chosen||chosen.status!=='approved')return res.status(404).json({error:'Introuvable'});await addActivity({type:'vote',author:'ADV MEMBER',text:`Nouveau vote pour ${chosen.vehicle||chosen.author||'un projet automobile'}`,mediaId:chosen.id});res.json({ok:true,votes:chosen.votes})});
app.post('/api/media/:id/view',async(req,res)=>{const item=await mutate(req.params.id,x=>({...x,views:Number(x.views||0)+1}));if(!item)return res.status(404).json({error:'Introuvable'});res.json({views:item.views})});
function admin(req,res,next){if(!process.env.ADMIN_TOKEN||req.headers.authorization!==`Bearer ${process.env.ADMIN_TOKEN}`)return res.status(401).json({error:'Non autorisé'});next()}
app.get('/api/admin/media',admin,async(req,res)=>res.json({items:await list(req.query.status)}));
app.patch('/api/admin/media/:id',admin,async(req,res)=>{try{const body=req.body&&typeof req.body==='object'?req.body:{};const allowed={};if(Object.prototype.hasOwnProperty.call(body,'status')){if(!['pending','approved','rejected'].includes(body.status))return res.status(400).json({error:'Statut invalide'});allowed.status=body.status;}if(Object.prototype.hasOwnProperty.call(body,'featured'))allowed.featured=Boolean(body.featured);if(Object.prototype.hasOwnProperty.call(body,'caption'))allowed.caption=String(body.caption||'').slice(0,300);if(Object.prototype.hasOwnProperty.call(body,'author'))allowed.author=String(body.author||'').slice(0,60);if(!Object.keys(allowed).length)return res.status(400).json({error:'Aucune modification reçue'});const item=await update(req.params.id,allowed);return item?res.json(item):res.status(404).json({error:'Introuvable'});}catch(error){console.error('Erreur mise à jour média',error);return res.status(500).json({error:'Impossible de mettre à jour ce contenu'});}});

app.post('/api/admin/media/:id/action',admin,async(req,res)=>{try{const action=String(req.body?.action||'');let item;if(action==='approve'){item=await update(req.params.id,{status:'approved'});if(item)await addActivity({type:'approved',author:item.author,text:`${item.author||'Un membre'} vient d’être publié dans la galerie`,mediaId:item.id});}else if(action==='reject')item=await update(req.params.id,{status:'rejected'});else if(action==='feature')item=await update(req.params.id,{featured:Boolean(req.body?.featured)});else if(action==='delete'){item=await remove(req.params.id);if(item?.url?.startsWith('/media/'))await fs.unlink(path.join(publicDir,path.basename(item.url))).catch(()=>{});}else return res.status(400).json({error:'Action inconnue'});if(!item)return res.status(404).json({error:'Contenu introuvable'});return res.json({ok:true,item});}catch(error){console.error('ADMIN ACTION ERROR',error);return res.status(500).json({error:error?.message||'Erreur interne pendant l’action'});}});
app.delete('/api/admin/media/:id',admin,async(req,res)=>{const item=await remove(req.params.id);if(!item)return res.status(404).json({error:'Introuvable'});if(item.url?.startsWith('/media/'))await fs.unlink(path.join(publicDir,path.basename(item.url))).catch(()=>{});res.json({ok:true})});
app.use((err,req,res,next)=>{console.error('REQUEST ERROR',err);const status=err.code==='LIMIT_FILE_SIZE'?413:(err.status||400);res.status(status).json({error:err.code==='LIMIT_FILE_SIZE'?'Fichier trop volumineux':(err.message||'Requête invalide')});});
app.listen(port,'0.0.0.0',()=>console.log(`Rasso.69 Media Hub : ${base}`));
