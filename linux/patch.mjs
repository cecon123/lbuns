#!/usr/bin/env node
// Patch only the verified v1.4.5 bundle. The upstream repository publishes
// Windows binaries, so the build script extracts these assets from its release.
import { createHash } from 'node:crypto';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const sourceDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw new Error('Usage: node linux/patch.mjs <extracted app directory>');

const backendPath = join(appDir, 'Resources/app/bun/index.js');
const htmlPath = join(appDir, 'Resources/app/views/main/index.html');
const cssPath = join(appDir, 'Resources/app/views/main/linux.css');
let backend = await readFile(backendPath, 'utf8');
const digest = createHash('sha256').update(backend).digest('hex');
if (digest !== 'ce2c51224b44019331bafffa6675308c077e9f2702adfe1043b02c3b17c3cc05') {
  throw new Error(`Unexpected LBUNS backend SHA-256: ${digest}`);
}

function replaceOnce(before, after, label) {
  const first = backend.indexOf(before);
  if (first < 0 || backend.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected exactly one ${label} anchor`);
  }
  backend = backend.slice(0, first) + after + backend.slice(first + before.length);
}

replaceOnce('class gT{', 'class gT{lessonCache=new Map;', 'lesson cache field');
replaceOnce(
  'this[Z(271)]=J,this[Z(431)][Z(281)]=!1',
  'this[Z(271)]=J,this.lessonCache.clear(),this[Z(431)][Z(281)]=!1',
  'clear cache on connect',
);
replaceOnce(
  '}return this.snapshot()}async["disconnect"]()',
  `}if(this.state.connected&&this.state.classes.length){
    const classes=this.state.classes,signal=this[Z(342)].signal;
    let next=1;
    const prefetch=async()=>{
      while(next<classes.length&&!signal.aborted){
        const classId=classes[next++]?.id;
        if(!classId)continue;
        const pending=this[Z(245)](classId,signal)[Z(275)]();
        this.lessonCache.set(classId,pending);
        try{await pending}catch{this.lessonCache.delete(classId)}
      }
    };
    void Promise.all(Array.from({length:Math.min(2,classes.length-1)},prefetch));
    return this.loadClass({classId:classes[0].id});
  }return this.snapshot()}async["disconnect"]()`,
  'autoselect and prefetch classes',
);
replaceOnce(
  'this.token="",this.state[$(281)]=!1',
  'this.token="",this.lessonCache.clear(),this.state[$(281)]=!1',
  'clear cache on disconnect',
);
replaceOnce(
  '[q,X]=await Promise[Z(372)]([Y[Z(275)](),Y[Z(302)]()])',
  '[q,X]=await Promise[Z(372)]([this.lessonCache.has(K)?this.lessonCache.get(K).then(v=>(this.lessonCache.delete(K),v),()=>{this.lessonCache.delete(K);return Y[Z(275)]()}):Y[Z(275)](),Y[Z(302)]()])',
  'consume prefetched lessons',
);
replaceOnce(
  'title:HX?"LBUNS - Offline demo":"LBUNS"',
  'title:HX?"LBUNS Linux - Offline demo":"LBUNS Linux v1.4.5.1"',
  'Linux window title',
);
replaceOnce(
  'Q=Math.min(1080,Math.max(1,J.width-32)),Y=Math.min(720,Math.max(1,J.height-32))',
  'Q=Math.min(1600,Math.max(1,J.width-32)),Y=Math.min(900,Math.max(1,J.height-32))',
  'Linux window size',
);
replaceOnce('updater:iT', 'updater:void 0', 'disable Windows updater');
const updateChecks = backend.split('iT.check()');
if (updateChecks.length !== 3) throw new Error('Expected two Windows update checks');
backend = updateChecks.join('Promise.resolve()');

await writeFile(backendPath, backend);
let html = await readFile(htmlPath, 'utf8');
const styleAnchor = '<link rel="stylesheet" href="styles.css" />';
if (html.split(styleAnchor).length !== 2) throw new Error('Unexpected HTML stylesheet anchor');
html = html.replace(styleAnchor, `${styleAnchor}\n    <link rel="stylesheet" href="linux.css" />`);
await writeFile(htmlPath, html);
await copyFile(join(sourceDir, 'styles.css'), cssPath);
console.log('Patched LBUNS v1.4.5 for Linux v1.4.5.1');
