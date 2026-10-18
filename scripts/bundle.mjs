import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const assets={};
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else {const name='/'+path.relative('public',p).split(path.sep).join('/');assets[name]=await readFile(p,'utf8')}}}
await walk('public');
const schedule=(await readFile('src/schedule.js','utf8')).replace('export const DATA','const DATA');
const source=(await readFile('src/index.js','utf8')).replace("import { DATA } from './schedule.js';",schedule).replace('export default {async fetch(req,env){','const backend = {async fetch(req,env){');
const deploySource=source.replace(/\bexport (?=async function|function|const)/g,'');
const wrapper=`\nconst embeddedAssets=${JSON.stringify(assets)};\nexport default {fetch(req,env,ctx){return backend.fetch(req,{...env,ASSETS:{fetch:async request=>{const p=new URL(request.url).pathname;const body=embeddedAssets[p];if(body===undefined)return new Response('Not found',{status:404});const ext=p.split('.').pop();const type={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',json:'application/json',txt:'text/plain; charset=utf-8'}[ext]||'application/octet-stream';return new Response(body,{headers:{'content-type':type,'cache-control':'no-cache'}})}}},ctx)}};\n`;
await mkdir('dist',{recursive:true});await writeFile('dist/worker.mjs',deploySource+wrapper);console.log('Worker bundle prepared with '+Object.keys(assets).length+' local assets.');
