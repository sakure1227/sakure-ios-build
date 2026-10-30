// \u7528 Node \u771f\u5b9e\u8d70\u4e00\u904d\u767e\u4e91\u7684\u626b\u7801\u767b\u5f55\uff1a\u53d6\u7801\u2192\u8f6e\u8be2\u2192\u770b 803 \u65f6\u7ed9\u4e86\u4ec0\u4e48
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
function post(path,data,cookie=''){return new Promise((res,rej)=>{
 const p=weapi(data);const body=new URLSearchParams({params:p.params,encSecKey:p.encSecKey}).toString();
 const req=https.request({hostname:'interface.music.163.com',path:'/weapi/'+path,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(body),'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',Referer:'https://music.163.com/',...(cookie?{Cookie:cookie}:{})}},r=>{
  let b='';r.on('data',d=>b+=d);r.on('end',()=>res({status:r.statusCode,body:b,setCookie:r.headers['set-cookie']||[]}));});
 req.on('error',rej);req.setTimeout(15000,()=>req.destroy(new Error('timeout')));req.write(body);req.end();});}
(async()=>{
 const k=await post('login/qrcode/unikey',{type:3});
 const key=JSON.parse(k.body).unikey;
 console.log('unikey:',key);
 // \u8f6e\u8be2\u4e00\u6b21\uff08\u672a\u626b\u7801\uff09\uff0c\u770b\u5e73\u53f0\u7ed9\u4e86\u4ec0\u4e48
 for(let i=0;i<2;i++){
  const c=await post('login/qrcode/client/login',{key,type:3});
  console.log('\n--- \u7b2c'+(i+1)+'\u6b21\u8f6e\u8be2 ---');
  console.log('body:', c.body.slice(0,250));
  console.log('Set-Cookie \u6570\u91cf:', c.setCookie.length);
  console.log('Set-Cookie \u524d\u4e24\u4e2a:', JSON.stringify(c.setCookie.slice(0,2)).slice(0,220));
 }
})();
