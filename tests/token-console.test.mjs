import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const script = await readFile(new URL('../docs/token-console.js', import.meta.url), 'utf8');

function setup({ clipboardFails = false } = {}) {
  const copied = [];
  const logs = [];
  const calls = [];
  const fetch = (...args) => {
    calls.push(args);
    return Promise.resolve('response');
  };
  class XHR {
    open(_method, url) { this.url = url; }
    setRequestHeader(name, value) { this.header = [name, value]; }
  }
  const originalOpen = XHR.prototype.open;
  const originalSetHeader = XHR.prototype.setRequestHeader;
  const window = { fetch };
  let fallbackUsed = false;
  const context = {
    window,
    XMLHttpRequest: XHR,
    Request,
    Headers,
    navigator: {
      clipboard: {
        async writeText(value) {
          if (clipboardFails) throw new Error('denied');
          copied.push(value);
        },
      },
    },
    document: {
      body: { appendChild() {} },
      createElement() { return { style: {}, select() {}, remove() {} }; },
      execCommand(command) {
        assert.equal(command, 'copy');
        fallbackUsed = true;
        copied.push(context.lastTextarea.value);
        return true;
      },
    },
    console: {
      info(...args) { logs.push(args.join(' ')); },
      warn(...args) { logs.push(args.join(' ')); },
    },
  };
  context.document.createElement = () => {
    context.lastTextarea = { style: {}, select() {}, remove() {} };
    return context.lastTextarea;
  };
  runInNewContext(script, context);
  return { copied, logs, calls, window, XHR, fetch, originalOpen, originalSetHeader, fallbackUsed: () => fallbackUsed };
}

test('fetch copies first Bearer token without changing the request', async () => {
  const app = setup();
  const request = new Request('https://dhqg.lms.api/api/v1/lessons', {
    headers: { Authorization: 'Bearer old-token' },
  });
  const init = { headers: { Authorization: 'Bearer demo-token' } };
  assert.equal(await app.window.fetch(request, init), 'response');
  await new Promise(setImmediate);
  assert.deepEqual(app.copied, ['demo-token']);
  assert.equal(app.calls[0][0], request);
  assert.equal(app.calls[0][1], init);
  assert.equal(app.window.fetch, app.fetch);
  assert.equal(app.XHR.prototype.open, app.originalOpen);
  assert.equal(app.XHR.prototype.setRequestHeader, app.originalSetHeader);
  assert.ok(app.logs.every(line => !line.includes('demo-token')));
});

test('XHR uses the clipboard fallback and ignores non-Bearer headers', async () => {
  const app = setup({ clipboardFails: true });
  const xhr = new app.XHR();
  xhr.open('GET', 'https://dhqg.lms.api/api/v1/classes');
  xhr.setRequestHeader('Authorization', 'Basic ignored');
  xhr.setRequestHeader('Authorization', 'Bearer xhr-token');
  await new Promise(setImmediate);
  assert.deepEqual(app.copied, ['xhr-token']);
  assert.equal(app.fallbackUsed(), true);
  assert.equal(app.XHR.prototype.open, app.originalOpen);
  assert.equal(app.XHR.prototype.setRequestHeader, app.originalSetHeader);
  assert.ok(app.logs.every(line => !line.includes('xhr-token')));
});
