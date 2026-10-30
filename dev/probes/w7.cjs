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
function post(path,data,cookie=''){const t0=Date.now();return new Promise((res,rej)=>{
 const p=weapi(data);const body=new URLSearchParams({params:p.params,encSecKey:p.encSecKey}).toString();
 const req=https.request({hostname:'interface.music.163.com',path:'/weapi/'+path,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body),'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',Referer:'https://music.163.com/',...(cookie?{Cookie:cookie}:{})}},r=>{
  let b='';r.on('data',d=>b+=d);r.on('end',()=>res({ms:Date.now()-t0,body:b.slice(0,150)}));});
 req.on('error',rej);req.setTimeout(20000,()=>req.destroy(new Error('timeout')));req.write(body);req.end();});}
(async()=>{
 console.log('w/nuser/account/get \u65e0 cookie:', JSON.stringify(await post('w/nuser/account/get',{})));
 console.log('w/nuser/account/get \u6709\u5047 cookie:', JSON.stringify(await post('w/nuser/account/get',{},'MUSIC_U=sim-realistic-cookie-value')));
 console.log('nuser/account/get \u6709\u5047 cookie:', JSON.stringify(await post('nuser/account/get',{},'MUSIC_U=sim-realistic-cookie-value')));
})();
