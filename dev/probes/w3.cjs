const CryptoJS=require('crypto-js'),forge=require('node-forge'),https=require('https');
const iv='0102030405060708',pk='0CoJUm6Qyw8W8jud';
const b62='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const pub=`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;
const ae=(t,m,k,i)=>CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(t),CryptoJS.enc.Utf8.parse(k),{iv:CryptoJS.enc.Utf8.parse(i),mode:CryptoJS.mode[m.toUpperCase()],padding:CryptoJS.pad.Pkcs7}).toString();
const re=(s,k)=>forge.util.bytesToHex(forge.pki.publicKeyFromPem(k).encrypt(s,'NONE'));
const weapi=(o)=>{const t=JSON.stringify(o);let sk='';for(let i=0;i<16;i++)sk+=b62.charAt(Math.round(Math.random()*61));
 return{params:ae(ae(t,'cbc',pk,iv),'cbc',sk,iv),encSecKey:re(sk.split('').reverse().join(''),pub)};};
function post(path,data,ua){return new Promise((res,rej)=>{
 const p=weapi(data);const body=new URLSearchParams({params:p.params,encSecKey:p.encSecKey}).toString();
 const req=https.request({hostname:'interface.music.163.com',path:'/weapi/'+path,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body),'User-Agent':ua,Referer:'https://music.163.com/'}},r=>{
  let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,len:b.length,body:b.slice(0,100)}));});
 req.on('error',rej);req.setTimeout(15000,()=>req.destroy(new Error('timeout')));req.write(body);req.end();});}
(async()=>{
 const UAS = {
   'CsHttp 的 UA (Android)': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
   '桌面 Chrome': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
   '真机 WebView UA': 'Mozilla/5.0 (Linux; Android 16; AMP-AN00 Build/HONORAMP-AN00; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36',
 };
 for (const [name, ua] of Object.entries(UAS)) {
   const r = await post('login/qrcode/unikey',{type:3}, ua);
   console.log(name+':', r.status, 'len='+r.len, r.body || '(空)');
 }
})();
