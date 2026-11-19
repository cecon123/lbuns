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
const rendererPath = join(appDir, 'Resources/app/views/main/main.js');
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

let renderer = await readFile(rendererPath, 'utf8');
const rendererDigest = createHash('sha256').update(renderer).digest('hex');
if (rendererDigest !== 'bf3e4a5cccb429b14a206f69e4f2fc3de08cf6207ab559446200a244d26369cf') {
  throw new Error(`Unexpected LBUNS renderer SHA-256: ${rendererDigest}`);
}
function replaceRendererOnce(before, after, label) {
  const first = renderer.indexOf(before);
  if (first < 0 || renderer.indexOf(before, first + before.length) >= 0) {
    throw new Error(`Expected exactly one ${label} renderer anchor`);
  }
  renderer = renderer.slice(0, first) + after + renderer.slice(first + before.length);
}

// Keep future-dated folders in the catalogue and carry their release date to
// descendants. The UI labels them; startRun also rejects them independently.
replaceOnce('function ST($,Z=0){', 'function ST($,Z=0,openAt=0){', 'lesson flattening signature');
replaceOnce(
  'for(let Q of $)if(J[K(209)]({',
  'for(let Q of $){let nextOpenAt=Math.max(openAt,new Date(Q.startDate).getTime()||0);if(J[K(209)]({',
  'lesson availability calculation',
);
replaceOnce(
  'mincore:Q[K(212)]}),',
  'mincore:Q[K(212)],notOpen:nextOpenAt>Date.now(),availableAt:nextOpenAt||null}),',
  'lesson availability fields',
);
replaceOnce(
  'let Y=ST(Q.childrens,Z+1);J.push(...Y)}return J}',
  'let Y=ST(Q.childrens,Z+1,nextOpenAt);J.push(...Y)}}return J}',
  'inherit folder availability',
);
replaceOnce('H=f60(q);', 'H=q;', 'retain upcoming lesson folders');
replaceOnce(
  'this[Z(431)][Z(264)].filter((_)=>!_[Z(249)]&&Y.has(_.id))',
  'this[Z(431)][Z(264)].filter((_)=>!_[Z(249)]&&!_.notOpen&&Y.has(_.id))',
  'block running unopened lessons',
);

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
  'title:HX?"LBUNS Linux - Offline demo":"LBUNS Linux v1.4.5.2"',
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

replaceRendererOnce(
  'f=()=>{let x=t;e(x(836))[x(469)]=!0,e("toggleLessons")[x(651)]=x(681),e(x(524))[x(509)]("aria-expanded",x(759))}',
  'f=()=>{}',
  'disable automatic lesson collapse',
);
replaceRendererOnce(
  'e(t(524))[t(890)](t(526),()=>{let x=t,n=e("lessonBrowser");n[x(469)]=!n[x(469)];let a=e(x(524));a[x(651)]=n.hidden?x(681):x(785),a[x(509)](x(540),String(!n.hidden))}),',
  '',
  'remove lesson collapse control',
);
replaceRendererOnce(
  'function I(){let x=t,n=e(x(614))',
  'function I(){for(let lesson of c?.lessons??[])if(lesson.notOpen)C.delete(lesson.id);let x=t,n=e(x(614))',
  'clear selected upcoming lessons',
);
replaceRendererOnce(
  'U.append(W(B[x(769)](p.id)?x(796):"chevronDown"),l(x(531),"",p.title)),U[x(890)]',
  'U.append(W(B[x(769)](p.id)?x(796):"chevronDown"),l(x(531),"",p.title));if(p.notOpen){U.classList.add("lesson-upcoming");U.append(l("span","lesson-locked-badge","Chưa mở"))}U[x(890)]',
  'label upcoming folders',
);
replaceRendererOnce(
  'V=l("label",x(895));V[x(543)]',
  'V=l("label",x(895));if(p.notOpen){V.classList.add("lesson-upcoming");V.title="Mở từ "+new Date(p.availableAt).toLocaleDateString("vi-VN")}V[x(543)]',
  'label upcoming lessons',
);
replaceRendererOnce(
  'z[x(748)]=C[x(769)](p.id),z[x(890)]',
  'z[x(748)]=C[x(769)](p.id)&&!p.notOpen,z.disabled=!!p.notOpen,z[x(890)]',
  'disable upcoming lesson checkboxes',
);
replaceRendererOnce(
  'p.completed?"lesson-done":x(873)',
  'p.notOpen?x(873):p.completed?"lesson-done":x(873)',
  'upcoming lesson status style',
);
replaceRendererOnce(
  'p.completed?x(756):x(494)',
  'p.notOpen?"Chưa mở":p.completed?x(756):x(494)',
  'upcoming lesson status',
);
replaceRendererOnce(
  'if(!n[x(637)]&&!n[x(784)])C[x(821)](n.id)',
  'if(!n[x(637)]&&!n[x(784)]&&!n.notOpen)C[x(821)](n.id)',
  'skip upcoming lessons in select incomplete',
);
replaceRendererOnce(
  ';c=x,c[n(555)]',
  ';c=x;promptAuth(x);c[n(555)]',
  'watch authorization failures',
);
replaceRendererOnce(
  'let N0=setInterval(',
  `const authDialog=e("reauthDialog"),authForm=e("reauthForm"),authInput=e("reauthToken"),authError=e("reauthError"),authRunHint=e("reauthRunHint"),authSubmit=e("reauthSubmit"),authPrompted=new Set;
  function promptAuth(state){
    const failed=(state.tasks??[]).filter(task=>typeof task.error==="string"&&/(?:\\[\\s*401\\s*\\]|\\bunauthorized\\b)/i.test(task.error)&&!authPrompted.has(task.id));
    if(!failed.length)return;
    for(const task of failed)authPrompted.add(task.id);
    if(!authDialog.open){authRunHint.hidden=!state.run?.active;authError.hidden=true;authDialog.showModal();authInput.focus()}
  }
  e("reauthCancel").addEventListener("click",()=>authDialog.close());
  authDialog.addEventListener("close",()=>{authInput.value="";authError.hidden=true});
  authForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const token=authInput.value.trim();
    if(!token){authError.textContent="Hãy nhập token LMS mới.";authError.hidden=false;return}
    authSubmit.disabled=true;authError.hidden=true;
    try{
      if(c?.run?.active)await i.cancelRun({runId:c.run.id});
      const state=await i.connect({token});
      k0(state);
      if(!state.connected)throw Error(state.error||"Token không hợp lệ hoặc LMS chưa sẵn sàng.");
      authDialog.close();
    }catch(error){
      authError.textContent=String(error?.message??error).replaceAll(token,"[redacted]");
      authError.hidden=false;
    }finally{authSubmit.disabled=false}
  });
  let N0=setInterval(`,
  'reauthentication dialog behavior',
);

await writeFile(backendPath, backend);
await writeFile(rendererPath, renderer);
let html = await readFile(htmlPath, 'utf8');
const styleAnchor = '<link rel="stylesheet" href="styles.css" />';
if (html.split(styleAnchor).length !== 2) throw new Error('Unexpected HTML stylesheet anchor');
html = html.replace(styleAnchor, `${styleAnchor}\n    <link rel="stylesheet" href="linux.css" />`);
const collapseControl = `            <button
              id="toggleLessons"
              class="text-button"
              type="button"
              aria-expanded="true"
              aria-controls="lessonBrowser"
            >
              Thu gọn
            </button>
`;
if (html.split(collapseControl).length !== 2) throw new Error('Unexpected lesson collapse control');
html = html.replace(collapseControl, '');
const scriptAnchor = '    <script type="module" src="main.js"></script>';
if (html.split(scriptAnchor).length !== 2) throw new Error('Unexpected renderer script anchor');
html = html.replace(scriptAnchor, `    <dialog id="reauthDialog" class="confirmation-dialog" aria-labelledby="reauthTitle">
      <form id="reauthForm">
        <h2 id="reauthTitle">Token LMS đã hết hạn</h2>
        <p>Nhập token mới để kết nối lại. Tác vụ đã lỗi sẽ không tự chạy lại.</p>
        <p id="reauthRunHint" class="confirmation-warning" hidden>
          Kết nối lại sẽ dừng phiên đang chạy và hủy các tác vụ còn chờ.
        </p>
        <label class="reauth-label" for="reauthToken">Token mới</label>
        <input id="reauthToken" class="reauth-token" type="password" autocomplete="off" spellcheck="false" required />
        <p id="reauthError" class="error-banner" role="alert" hidden></p>
        <div class="dialog-actions">
          <button id="reauthCancel" class="button secondary" type="button">Để sau</button>
          <button id="reauthSubmit" class="button primary" type="submit">Kết nối lại</button>
        </div>
      </form>
    </dialog>
${scriptAnchor}`);
await writeFile(htmlPath, html);
await copyFile(join(sourceDir, 'styles.css'), cssPath);
console.log('Patched LBUNS v1.4.5 for Linux v1.4.5.2');
