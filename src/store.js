import fs from 'node:fs/promises';
import path from 'node:path';
const file=path.resolve('data/media.json');
const activityFile=path.resolve('data/activity.json');
async function readJson(target,fallback=[]){try{return JSON.parse(await fs.readFile(target,'utf8'))}catch{return fallback}}
async function writeJson(target,data){await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(data,null,2))}
async function read(){return readJson(file,[])}
export async function list(status){const rows=await read();return status?rows.filter(x=>x.status===status):rows}
export async function add(item){const rows=await read();rows.unshift(item);await writeJson(file,rows);return item}
export async function update(id,patch){const rows=await read(),i=rows.findIndex(x=>x.id===id);if(i<0)return null;rows[i]={...rows[i],...patch};await writeJson(file,rows);return rows[i]}
export async function mutate(id,fn){const rows=await read(),i=rows.findIndex(x=>x.id===id);if(i<0)return null;rows[i]=fn({...rows[i]});await writeJson(file,rows);return rows[i]}
export async function remove(id){const rows=await read(),i=rows.findIndex(x=>x.id===id);if(i<0)return null;const [item]=rows.splice(i,1);await writeJson(file,rows);return item}
export async function addActivity(event){const rows=await readJson(activityFile,[]);rows.unshift({...event,id:event.id||`${Date.now()}_${Math.random().toString(36).slice(2)}`,createdAt:event.createdAt||new Date().toISOString()});await writeJson(activityFile,rows.slice(0,100));return rows[0]}
export async function listActivity(limit=20){const rows=await readJson(activityFile,[]);return rows.slice(0,Math.max(1,Math.min(50,Number(limit)||20)))}
test

const scoresFile=path.resolve('data/scores.json');
export async function submitScore(entry){
  const rows=await readJson(scoresFile,[]);
  const player=String(entry.player||'').trim().replace(/^@+/,'').slice(0,40);
  const game=String(entry.game||'').trim();
  const score=Number(entry.score);
  const lowerIsBetter=['launch','pit','memory'].includes(game);
  const i=rows.findIndex(x=>x.player.toLowerCase()===player.toLowerCase()&&x.game===game);
  const item={id:i>=0?rows[i].id:`${Date.now()}_${Math.random().toString(36).slice(2)}`,player,game,score,unit:String(entry.unit||'').slice(0,12),updatedAt:new Date().toISOString()};
  if(i>=0){
    const previous=Number(rows[i].score);
    const improved=lowerIsBetter?score<previous:score>previous;
    if(!improved)return {item:rows[i],improved:false};
    rows[i]=item;
  }else rows.push(item);
  await writeJson(scoresFile,rows);
  return {item,improved:true};
}
export async function listScores(){
  return readJson(scoresFile,[]);
}
