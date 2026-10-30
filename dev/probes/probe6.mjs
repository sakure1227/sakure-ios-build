import { WebSocket } from 'ws';
import { request } from 'node:http';
const PORT = '9225';
const getJson = (path) => new Promise((res, rej) => {
  const req = request({host:'127.0.0.1',port:Number(PORT),path,timeout:8000}, r => {
    let b=''; r.on('data',c=>b+=c); r.on('end',()=>{try{res(JSON.parse(b))}catch(e){rej(e)}});
  });
  req.on('error',rej); req.on('timeout',()=>req.destroy(new Error('t'))); req.end();
});
const list = await getJson('/json/list');
const page = list.find(t=>t.type==='page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
let id=0; const pend=new Map();
const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}))});
ws.on('message',raw=>{const m=JSON.parse(raw.toString()); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
await new Promise(r=>ws.onopen=r);
await send('Runtime.enable');
const ev=async(expr)=>{const res=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
  if(res?.exceptionDetails) return 'EXC: '+(res.exceptionDetails.exception?.description||'').slice(0,300);
  return res?.result?.value};

// 打开设置弹窗
console.log('打开设置弹窗：');
console.log(await ev(`(async () => {
  try {
    // 通过命令面板/键盘触发不方便；直接找 DOM 上的设置按钮
    const btn = [...document.querySelectorAll('button')].find(b => /设置|options/i.test(b.getAttribute('aria-label')||b.textContent||''));
    if (btn) { btn.click(); return 'clicked: '+(btn.textContent||btn.getAttribute('aria-label')); }
    return 'no settings button found';
  } catch(e){ return 'ERR '+e.message }
})()`));
await new Promise(r=>setTimeout(r,1500));
console.log('\n设置弹窗开着的状态：');
console.log(await ev(`JSON.stringify({
  dialogs: document.querySelectorAll('[role="dialog"]').length,
  text: (document.querySelector('[role="dialog"]')?.innerText||'').slice(0,150),
  canvasCount: document.querySelectorAll('canvas').length,
}, null, 1)`));
ws.close();
