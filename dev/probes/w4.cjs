// \u7528 Node \u751f\u6210\u4e00\u4e2a\u771f\u5b9e\u7684 weapi body\uff0c\u7136\u540e\u62ff\u53bb\u624b\u673a\u4e0a\u53d1\u3002
const CryptoJS=require('crypto-js'),forge=require('node-forge');
const iv='0102030405060708',pk='0CoJUm6Qyw8W8jud';
const b62='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const pub=`-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDgtQn2JZ34ZC28NWYpAUd98iZ37BUrX/aKzmFbt7clFSs6sXqHauqKWqdtLkF2KexO40H1YTX8z2lSgBBOAxLsvaklV8k4cBFK9snQXE9/DDaFt6Rr7iVZMldczhC0JNgTz+SHXT6CBHuX3e9SdB1Ua44oncaTWz7OBGLbCiK45wIDAQAB
-----END PUBLIC KEY-----`;
const ae=(t,m,k,i)=>CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(t),CryptoJS.enc.Utf8.parse(k),{iv:CryptoJS.enc.Utf8.parse(i),mode:CryptoJS.mode[m.toUpperCase()],padding:CryptoJS.pad.Pkcs7}).toString();
const re=(s,k)=>forge.util.bytesToHex(forge.pki.publicKeyFromPem(k).encrypt(s,'NONE'));
const weapi=(o)=>{const t=JSON.stringify(o);let sk='';for(let i=0;i<16;i++)sk+=b62.charAt(Math.round(Math.random()*61));
 return{params:ae(ae(t,'cbc',pk,iv),'cbc',sk,iv),encSecKey:re(sk.split('').reverse().join(''),pub)};};
const p=weapi({type:3});
console.log(JSON.stringify({body: new URLSearchParams({params:p.params,encSecKey:p.encSecKey}).toString()}));
