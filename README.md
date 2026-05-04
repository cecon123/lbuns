HELLO WORLD

## Bookmark
```js
javascript:(function(t){let d=0;const f=window.fetch,o=XMLHttpRequest.prototype.open,s=XMLHttpRequest.prototype.setRequestHeader,x=v=>{if(d)return;d=1;let c=v.replace(/^Bearer\s+/i,'');navigator.clipboard.writeText(c).then(()=>{alert('Đã copy Token!');console.log('%c[First Token Copied]:','color:lime',c)}).catch(()=>{let e=document.createElement('textarea');e.value=c;document.body.appendChild(e);e.select();document.execCommand('copy');document.body.removeChild(e);alert('Đã copy Token!');})};window.fetch=async(...a)=>{let u=a[0]instanceof Request?a[0].url:a[0],h=new Headers(a[1]?.headers).get(%27Authorization%27);if(u.includes(t)&&h)x(h);return f(...a)};XMLHttpRequest.prototype.open=function(m,u){this._u=u;return o.apply(this,arguments)};XMLHttpRequest.prototype.setRequestHeader=function(h,v){if(this._u?.includes(t)&&h.toLowerCase()===%27authorization%27)x(v);return s.apply(this,arguments)};console.clear();console.log(%27%c[System] Đang chờ request để lấy Token...%27,%27color:cyan%27)})(%27dhqg.lms.api/api/v1/%27);
```
