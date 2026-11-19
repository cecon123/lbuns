import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';

const appDir = process.env.LBUNS_APP_DIR;
if (!appDir) throw new Error('LBUNS_APP_DIR must point to a built Linux app');
const backend = await readFile(join(appDir, 'Resources/app/bun/index.js'), 'utf8');
const renderer = await readFile(join(appDir, 'Resources/app/views/main/main.js'), 'utf8');
const html = await readFile(join(appDir, 'Resources/app/views/main/index.html'), 'utf8');

test('future folders and descendants remain visible but are locked', () => {
  const start = backend.indexOf('(function($,Z){let K=TT,J=$();');
  const end = backend.indexOf('function f60(', start);
  assert.ok(start >= 0 && end > start);
  const ST = runInNewContext(`${backend.slice(start, end)};ST`);
  const future = new Date(Date.now() + 7 * 86400000).toISOString();
  const lessons = ST([
    { id: 'open', title: 'Open', startDate: null },
    { id: 'folder', title: 'Upcoming', isFolder: true, startDate: future,
      childrens: [{ id: 'child', title: 'Child', startDate: null }] },
  ]);
  assert.equal(lessons.length, 3);
  assert.equal(lessons[0].notOpen, false);
  assert.equal(lessons[1].notOpen, true);
  assert.equal(lessons[2].notOpen, true);
  assert.equal(lessons[2].availableAt, Date.parse(future));
  assert.ok(backend.includes('H=q;'));
  assert.ok(backend.includes('!_.notOpen&&Y.has(_.id)'));
});

test('lesson panel cannot collapse and upcoming lessons cannot be selected', () => {
  assert.ok(html.includes('id="lessonBrowser"'));
  assert.ok(!html.includes('id="toggleLessons"'));
  assert.ok(renderer.includes('f=()=>{}'));
  assert.ok(renderer.includes('z.disabled=!!p.notOpen'));
  assert.ok(renderer.includes('&&!n.notOpen)C['));
  assert.ok(renderer.includes('"Chưa mở"'));
});

test('Unauthorized task opens one token dialog and reconnect explicitly stops an active run', async () => {
  const start = renderer.indexOf('const authDialog=e("reauthDialog")');
  const end = renderer.indexOf('let N0=setInterval(', start);
  assert.ok(start >= 0 && end > start);
  const handlers = new Map();
  const elements = new Map();
  for (const id of ['reauthDialog', 'reauthForm', 'reauthToken', 'reauthError',
    'reauthRunHint', 'reauthSubmit', 'reauthCancel']) {
    elements.set(id, {
      hidden: false,
      value: '',
      disabled: false,
      addEventListener(event, fn) { handlers.set(`${id}:${event}`, fn); },
    });
  }
  const dialog = elements.get('reauthDialog');
  let opens = 0;
  dialog.open = false;
  dialog.showModal = () => { dialog.open = true; opens++; };
  dialog.close = () => { dialog.open = false; handlers.get('reauthDialog:close')?.(); };
  elements.get('reauthToken').focus = () => {};
  const calls = [];
  const context = {
    e: id => elements.get(id),
    c: { run: { id: 'run-1', active: true } },
    i: {
      async cancelRun({ runId }) { calls.push(`cancel:${runId}`); },
      async connect({ token }) { calls.push(`connect:${token}`); return { connected: true, tasks: [] }; },
    },
    k0(state) { calls.push(`state:${state.connected}`); },
  };
  const { promptAuth } = runInNewContext(`${renderer.slice(start, end)};({promptAuth})`, context);
  promptAuth({ tasks: [{ id: 'other', error: '[500] Server error' }] });
  assert.equal(opens, 0);
  const unauthorized = { tasks: [{ id: 'task-1', error: '[401] Unauthorized' }], run: { active: true } };
  promptAuth(unauthorized);
  promptAuth(unauthorized);
  assert.equal(opens, 1);
  assert.equal(elements.get('reauthRunHint').hidden, false);
  elements.get('reauthToken').value = 'new-token';
  await handlers.get('reauthForm:submit')({ preventDefault() {} });
  assert.deepEqual(calls, ['cancel:run-1', 'connect:new-token', 'state:true']);
  assert.equal(dialog.open, false);
  assert.equal(elements.get('reauthToken').value, '');
  promptAuth(unauthorized);
  assert.equal(opens, 1);
});
