import fs from 'node:fs/promises';import path from 'node:path';
const file=path.resolve('data/media.json');
async function read(){try{return JSON.parse(await fs.readFile(file,'utf8'))}catch{return []}}
export async function list(status){const rows=await read();return status?rows.filter(x=>x.status===status):rows}
export async function add(item){const rows=await read();rows.unshift(item);await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(rows,null,2));return item}
export async function update(id,patch){const rows=await read(),i=rows.findIndex(x=>x.id===id);if(i<0)return null;rows[i]={...rows[i],...patch};await fs.writeFile(file,JSON.stringify(rows,null,2));return rows[i]}
