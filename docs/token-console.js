// Paste this script into the LMS page's browser Console, then trigger an LMS request.
// It copies the first Authorization bearer token to your clipboard and removes its hooks.
(() => {
  const target = 'dhqg.lms.api/api/v1/';
  const originalFetch = window.fetch;
  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const xhrUrl = Symbol('lbunsLmsUrl');
  let captured = false;

  function restore() {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalOpen;
    XMLHttpRequest.prototype.setRequestHeader = originalSetHeader;
  }

  async function copy(value) {
    if (captured || typeof value !== 'string' || !/^Bearer\s+/i.test(value)) return;
    const token = value.replace(/^Bearer\s+/i, '').trim();
    if (!token) return;
    captured = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(token);
      restore();
      console.info('[LBUNS] Token đã được copy vào clipboard.');
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = token;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      let copied = false;
      try {
        document.body.appendChild(textarea);
        textarea.select();
        copied = document.execCommand('copy');
      } catch (fallbackError) {
        console.warn('[LBUNS] Cách copy dự phòng cũng thất bại.', fallbackError);
      } finally {
        textarea.remove();
      }
      if (copied) {
        restore();
        console.info('[LBUNS] Token đã được copy vào clipboard.');
      } else {
        captured = false;
        console.warn('[LBUNS] Không thể copy token. Hãy cấp quyền clipboard rồi thử lại.', error);
      }
    }
  }

  window.fetch = function (...args) {
    try {
      const input = args[0];
      const init = args[1];
      const url = input instanceof Request ? input.url : String(input);
      if (url.includes(target)) {
        const headers = new Headers(input instanceof Request ? input.headers : undefined);
        if (init?.headers) {
          new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        }
        void copy(headers.get('Authorization'));
      }
    } catch (error) {
      console.warn('[LBUNS] Không đọc được header của fetch request.', error);
    }
    return Reflect.apply(originalFetch, this, args);
  };

  XMLHttpRequest.prototype.open = function (method, url) {
    this[xhrUrl] = String(url);
    return Reflect.apply(originalOpen, this, arguments);
  };

  XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
    if (this[xhrUrl]?.includes(target) && String(name).toLowerCase() === 'authorization') {
      void copy(value);
    }
    return Reflect.apply(originalSetHeader, this, arguments);
  };

  console.info('[LBUNS] Đang chờ request LMS để copy token…');
})();
