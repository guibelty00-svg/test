import sharp from 'sharp';
/**
 * Connecteurs de production :
 * - Nudité image/vidéo : Google Cloud Vision SafeSearch ou AWS Rekognition.
 * - Plaques : Plate Recognizer (coordonnées des plaques), puis floutage avec Sharp.
 * - Vidéo : extraire plusieurs images avec ffmpeg, analyser chaque image, bloquer la vidéo si une plaque ou nudité est détectée.
 *
 * Cette version fonctionne en mode sécurisé "manual_review" tant qu'aucune clé n'est configurée : rien n'est publié automatiquement.
 */
export async function moderateImage(inputPath, outputPath){
  const hasNudityProvider=Boolean(process.env.GOOGLE_VISION_API_KEY);
  const hasPlateProvider=Boolean(process.env.PLATE_RECOGNIZER_TOKEN);
  if(!hasNudityProvider||!hasPlateProvider){await sharp(inputPath).rotate().jpeg({quality:88}).toFile(outputPath);return {decision:'manual_review',nudity:false,plates:[],reason:'Fournisseurs IA non configurés'}}
  // Points d'intégration volontairement isolés : ajoutez les appels API dans ces fonctions.
  const nudity=await detectNudity(inputPath);
  if(nudity.blocked)return {decision:'rejected',nudity:true,plates:[],reason:'Contenu sensible détecté'};
  const plates=await detectPlates(inputPath);
  await blurPlateRegions(inputPath,outputPath,plates);
  return {decision:'manual_review',nudity:false,plates,reason:plates.length?'Plaques floutées, validation humaine requise':'Validation humaine requise'};
}
export async function moderateVideo(){return {decision:'manual_review',reason:'Vidéo placée en validation. Configurez ffmpeg + fournisseurs IA pour l’analyse par images.'}}
async function detectNudity(){return {blocked:false}}
async function detectPlates(){return []}
async function blurPlateRegions(input,output,regions){
  let image=sharp(input).rotate();const meta=await image.metadata();
  if(!regions.length){await image.jpeg({quality:88}).toFile(output);return}
  const overlays=[];for(const r of regions){const w=Math.max(1,Math.round(r.width)),h=Math.max(1,Math.round(r.height));const buf=await sharp(input).extract({left:Math.max(0,Math.round(r.x)),top:Math.max(0,Math.round(r.y)),width:Math.min(w,meta.width),height:Math.min(h,meta.height)}).blur(24).toBuffer();overlays.push({input:buf,left:Math.round(r.x),top:Math.round(r.y)})}
  await image.composite(overlays).jpeg({quality:88}).toFile(output)
}
