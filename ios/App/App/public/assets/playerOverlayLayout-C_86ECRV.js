const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/dynamicIconImports-BWIKVT_H.js","assets/rolldown-runtime-C0FnF6B9.js","assets/browser-BGOEbMMF.js","assets/lucide-icons-OCpBzVAd.js","assets/stageLayerView-CsIhvVjH.js","assets/noLyricLines-D7xQ2k7U.js","assets/esm-DIAA5aiV.js","assets/guard-SDEnvOmH.js","assets/noLyricLines-QTgsb78Q.css","assets/motionSignals-BtxXL45V.js","assets/FoliumMountHost-SBFYZFUM.js","assets/workerClient-B2n2IM4H.js","assets/alternateText-BFCOvxNk.js","assets/wordSegmentation-DYLaQO7V.js","assets/usePlaybackStore-C8E43xhT.js","assets/providerRegistry-C4GnaajP.js","assets/config-zSesT6lv.js","assets/useStatusMessageStore-a4MUrPuL.js","assets/useVisualizerSettingsStore-BxAodGeS.js","assets/registry-DQ_eEvnx.js","assets/ColorField-CKzXUk0q.js","assets/urlBackground-DoiSbwyl.js","assets/tuningRegistry-BfGzHHC6.js","assets/frameRateLimiter-DYVxXwkE.js","assets/glowBlurQuantize-A7QIlrsX.js","assets/useAppChromeStore-DyN4BwqS.js","assets/useAppViewStore-BUsX2JLW.js","assets/useSettingsModalStore-DnKsgPU9.js","assets/kinds-BH-z2A0D.js","assets/stageContext--dhVrBlY.js","assets/audio-jdINDmaa.js"])))=>i.map(i=>d[i]);
import{o as e,r as t}from"./rolldown-runtime-C0FnF6B9.js";import{$ as n,D as r,F as i,Nn as a,Ps as o,Ya as s,a as c,hi as l,js as u,ri as d,to as f,xn as p}from"./lucide-icons-OCpBzVAd.js";import{f as m,p as h}from"./browser-BGOEbMMF.js";import{Er as g,Hr as _,Qr as v,Rr as y,_r as b,cr as x,ei as S,li as C,oi as w,or as T,qt as E,sr as D,wi as ee,xr as O,yr as k,zn as te}from"./noLyricLines-D7xQ2k7U.js";import{f as A,l as j,o as ne}from"./ColorField-CKzXUk0q.js";import{C as re,Q as ie,T as ae,V as M,X as oe,Y as se,Z as ce,_ as le,a as ue,b as de,f as N,l as fe,m as P,n as pe,p as F,r as me}from"./urlBackground-DoiSbwyl.js";import{i as he,l as ge,o as _e}from"./motionSignals-BtxXL45V.js";var I=e(o(),1),L=ee(),ve=e=>e,ye={id:`bg-common`,titleKey:`options.visualizerBackgroundModeCommon`},be={id:`bg-common-cover`,titleKey:`options.previewCoverBackgroundSettings`},xe=({config:e,actions:t,t:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a=e?.common,o=t?.common,s=a?.useCoverColorBg??!1;return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(M,{def:ye,bare:!0,children:[(0,L.jsx)(F,{label:n(`options.disableVisualizerVignette`),note:n(`options.disableVisualizerVignetteDesc`),checked:a?.disableVignette??!1,onChange:e=>o?.onDisableVignetteChange?.(e)}),(0,L.jsx)(F,{label:n(`options.disableVisualizerGeometricBackground`),note:n(`options.disableVisualizerGeometricBackgroundDesc`),checked:a?.disableGeometricBackground??!1,onChange:e=>o?.onDisableGeometricChange?.(e)})]}),(0,L.jsxs)(M,{def:be,children:[(0,L.jsx)(F,{label:n(`theme.addCoverColor`),note:n(`options.coverColorBackgroundDesc`),checked:s,onChange:e=>o?.onCoverColorChange?.(e)}),(0,L.jsx)(A,{when:s,children:(0,L.jsx)(N,{sub:!0,label:n(`options.previewCoverBackgroundOpacity`),value:a?.opacity??.75,min:0,max:1,step:.05,format:P,onChange:e=>o?.onOpacityChange?.(e),onDragStart:r,onDragEnd:i})})]})]})};_();var Se=384,Ce=160,we=350,Te=1e3,Ee=1e3,De=4e3,Oe=`data-picture-wait`,ke=`data-picture-arriving`,Ae={width:64,height:40},je=null,Me=e=>{if(!je){let e=document.createElement(`canvas`);e.width=Ae.width,e.height=Ae.height,je=e.getContext(`2d`,{willReadFrequently:!0}),je&&(je.imageSmoothingQuality=`high`)}if(!je)return!1;try{je.clearRect(0,0,Ae.width,Ae.height),je.drawImage(e,0,0,Ae.width,Ae.height);let t=new Uint32Array(je.getImageData(0,0,Ae.width,Ae.height).data.buffer);return t.every(e=>e===t[0])}catch{return je=null,!1}},Ne=e=>[...e.querySelectorAll(`canvas`)].filter(e=>e.width>0&&e.height>0).map(e=>({canvas:e,blank:Me(e)})),Pe=60,Fe=e=>[...e.querySelectorAll(`*`)].slice(0,Pe).some(e=>{let t=getComputedStyle(e);return!!t.backgroundImage&&t.backgroundImage!==`none`&&t.opacity!==`0`&&e.offsetWidth>0&&e.offsetHeight>0}),Ie=e=>{if(!e.firstElementChild||e.querySelector(`[data-picture-wait]`))return{shows:!1,whole:!1,waits:!1};let t=Ne(e),n=t.every(e=>!e.blank),r=t.some(e=>!e.blank)||!!e.textContent?.trim()||e.querySelector(`svg, img`)!==null,i=!r&&Fe(e),a=e.querySelector(`[${ke}]`)!==null;return{shows:r||i,whole:n,waits:a||i&&!n}},Le=e=>e.getAnimations({subtree:!0}).some(e=>e.playState===`running`&&Number.isFinite(Number(e.effect?.getComputedTiming().endTime))),Re=(e,t,n)=>{let r=performance.now(),i=r,a=0,o=0,s=0,c=new MutationObserver(()=>{i=performance.now()});t===`still`&&c.observe(e,{subtree:!0,childList:!0,attributes:!0,characterData:!0});let l=()=>{c.disconnect(),window.clearTimeout(o),window.cancelAnimationFrame(s)},u=()=>{o=window.setTimeout(()=>{s=window.requestAnimationFrame(f)})},d=()=>{let n=performance.now(),{shows:o,whole:s,waits:c}=Ie(e),l=o&&!c;return l&&!a&&(a=n),l&&(s||n-a>=Ee)&&(t===`drawn`||n-a>=we&&(n-i>=Ce&&!Le(e)||n-a>=Te))?`shown`:n-r>=De?o?`shown`:`empty`:null},f=()=>{let e;try{e=d()}catch(t){console.warn(`[LivePicture] A stage could not be read:`,t),e=`failed`}if(e){l(),n(e);return}u()};return u(),l},ze=(e,t,n=Math.min(e.width,Se))=>{t.width=Math.max(1,n),t.height=Math.max(1,Math.round(e.height*n/Math.max(1,e.width)));let r=t.getContext(`2d`);r&&(r.imageSmoothingQuality=`high`,r.drawImage(e,0,0,t.width,t.height))},Be=e=>e.replace(/[A-Z]/g,e=>`-${e.toLowerCase()}`),Ve=e=>{if(!Ie(e).shows)return null;let t=e.cloneNode(!0),n=t.querySelectorAll(`canvas`);e.querySelectorAll(`canvas`).forEach((e,t)=>{let r=n[t];r.style.width=`${e.offsetWidth}px`,r.style.height=`${e.offsetHeight}px`,e.width>0&&e.height>0&&ze(e,r)});let r=[...e.querySelectorAll(`*`)],i=t.querySelectorAll(`*`);i.forEach(e=>{e.style.willChange=`auto`});for(let t of e.getAnimations({subtree:!0})){let e=t.effect,n=e?.target&&!e.pseudoElement?i[r.indexOf(e.target)]:void 0;if(!e?.target||!n)continue;let a=getComputedStyle(e.target);for(let t of e.getKeyframes())for(let e of Object.keys(t))e!==`offset`&&e!==`computedOffset`&&e!==`easing`&&e!==`composite`&&n.style.setProperty(Be(e),a.getPropertyValue(Be(e)));n.style.animation=`none`}return t},He=e=>{let t=new Set(e.querySelectorAll(`canvas`)),n=e=>{for(let n of e)n.addedNodes.forEach(e=>{e instanceof HTMLCanvasElement?t.add(e):e instanceof Element&&e.querySelectorAll(`canvas`).forEach(e=>t.add(e))})},r=new MutationObserver(n);return r.observe(e,{subtree:!0,childList:!0}),()=>{n(r.takeRecords()),r.disconnect();for(let e of t)try{if(e.getContext(`2d`))continue;let t=e.getContext(`webgl2`)??e.getContext(`webgl`);t&&!t.isContextLost()&&t.getExtension(`WEBGL_lose_context`)?.loseContext()}catch{}}},Ue=e=>{let t=e.cloneNode(!0),n=t.querySelectorAll(`canvas`);return e.querySelectorAll(`canvas`).forEach((e,t)=>{e.width>0&&e.height>0&&ze(e,n[t],e.width)}),t},We=(0,I.createContext)(null),Ge=()=>{let e=(0,I.useContext)(We);return(0,I.useLayoutEffect)(()=>{e?.claim()},[e]),(0,I.useCallback)(()=>e?.drawn(),[e])},Ke=(0,I.createContext)(!1),qe=()=>(0,I.useContext)(Ke),Je=e=>Math.max(0,Math.min(1,e)),Ye=(e,t)=>t>=1?1:Je((e-t)/(1-t)),Xe=(e,t)=>{let n=Je(e),r=Je(t),i=r<=0||r>=1?n:n<=r?.5*n/r:.5+.5*(n-r)/(1-r);return i*i*(3-2*i)},Ze=e=>1-(1-e)**3,Qe=(e,t)=>e.length===t.length&&e.every((e,n)=>e===t[n]),$e=(e,t,n)=>{let r=e.join(`|`),i=(0,I.useMemo)(()=>r.split(`|`),[r]),[a,o]=(0,I.useState)(i),s=(0,I.useRef)(i);return(0,I.useEffect)(()=>{let e=s.current,r=e=>{s.current=e,o(e)};if(Qe(e,i))return;if(t<=0||e.length!==i.length){r(i);return}let a=t=>t>=1?i:i.map((n,r)=>D(e[r],n,t)),c=n?.get()??1;if(n&&c<1)return n.on(`change`,e=>r(a(Ye(e,c))));let l=performance.now(),u=0,d=e=>{let n=Math.min(1,(e-l)/t);r(a(n>=1?1:Ze(n))),n<1&&(u=requestAnimationFrame(d))};return u=requestAnimationFrame(d),()=>cancelAnimationFrame(u)},[i,t,n]),t<=0?i:a},et=24,tt=96,nt=()=>{if(typeof navigator>`u`)return!1;let e=navigator.userAgent,t=/iPad|iPhone|iPod/i.test(e)||navigator.platform===`MacIntel`&&navigator.maxTouchPoints>1,n=/WebKit/i.test(e),r=/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|YaBrowser|GSA/i.test(e);return t&&n&&!r},rt=e=>new Promise(t=>{if(typeof document>`u`){t(null);return}let n=new Image;n.crossOrigin=`anonymous`,n.decoding=`async`,n.onload=()=>{try{let e=document.createElement(`canvas`),r=document.createElement(`canvas`);e.width=et,e.height=et,r.width=tt,r.height=tt;let i=e.getContext(`2d`),a=r.getContext(`2d`);if(!i||!a){t(null);return}let o=n.naturalWidth||n.width,s=n.naturalHeight||n.height,c=Math.min(o,s),l=Math.max(0,(o-c)/2),u=Math.max(0,(s-c)/2);i.imageSmoothingEnabled=!0,i.imageSmoothingQuality=`high`,i.drawImage(n,l,u,c,c,0,0,et,et),a.imageSmoothingEnabled=!0,a.imageSmoothingQuality=`high`,a.globalAlpha=1,a.drawImage(e,0,0,et,et,0,0,tt,tt),[{x:-8,y:-8,size:112,alpha:.22},{x:6,y:0,size:tt,alpha:.14},{x:0,y:6,size:tt,alpha:.14}].forEach(({x:t,y:n,size:r,alpha:i})=>{a.globalAlpha=i,a.drawImage(e,0,0,et,et,t,n,r,r)}),a.globalAlpha=1,t(r.toDataURL(`image/jpeg`,.72))}catch(e){console.warn(`[FluidBackground] Failed to build soft focus cover`,e),t(null)}},n.onerror=()=>t(null),n.src=e}),it=320,at=640,ot=1e3,st=(e,t)=>{e.fillStyle=`#000`,e.fillStyle=t;let n=String(e.fillStyle),[r,i,a]=n.startsWith(`#`)?[1,3,5].map(e=>parseInt(n.slice(e,e+2),16)):n.match(/[\d.]+/g)??[`0`,`0`,`0`];return[n,`rgba(${r}, ${i}, ${a}, 0)`]},ct=(e,t)=>{let n=document.createElement(`canvas`);return n.width=e,n.height=t,n},lt=null,ut=()=>{if(lt!==null)return lt;try{let e=ct(4,1).getContext(`2d`,{willReadFrequently:!0});!e||typeof e.filter!=`string`?lt=!1:(e.filter=`blur(1px)`,e.fillStyle=`#fff`,e.fillRect(2,0,1,1),lt=e.getImageData(1,0,1,1).data[3]>0)}catch{lt=!1}return lt},dt=(e,t)=>{let{width:n,height:r}=e,i=n/Math.max(1,t*2.5),a=[],o=n,s=r;for(;o/2>=i&&o>2&&s>2;)o=Math.ceil(o/2),s=Math.ceil(s/2),a.push([o,s]);let c=[...a,...a.slice(0,-1).reverse(),[n,r]],l=e;for(let[e,t]of c){let n=ct(e,t),r=n.getContext(`2d`);if(!r)return l;r.imageSmoothingEnabled=!0,r.imageSmoothingQuality=`high`,r.drawImage(l,0,0,e,t),l=n}return l},ft=(e,t,n,r)=>{let i=ct(t,n),a=i.getContext(`2d`);if(!a)return null;let o=Math.max(t/e.width,n/e.height)*1.5,s=e.width*o,c=e.height*o,l=60*t/r,u=ut();return u&&(a.filter=`blur(${l}px)`),a.imageSmoothingEnabled=!0,a.imageSmoothingQuality=`high`,a.drawImage(e,(t-s)/2,(n-c)/2,s,c),u?i:dt(i,l)},pt=(e,t,n,r)=>{let i=e.getContext(`2d`);if(!i)return;let{width:a,height:o}=e;if(i.clearRect(0,0,a,o),!t)return;i.drawImage(t,0,0,a,o);let s=Math.hypot(a,o),c=a*o/s,l=o/s*c,u=a/s*c,d=i.createLinearGradient(a/2-l,o/2-u,a/2+l,o/2+u),[f,p]=st(i,n),[m,h]=st(i,r);d.addColorStop(0,f),d.addColorStop(.5,p),d.addColorStop(.5,h),d.addColorStop(1,m),i.globalCompositeOperation=`overlay`,i.globalAlpha=.4,i.fillStyle=d,i.fillRect(0,0,a,o),i.globalCompositeOperation=`source-over`,i.globalAlpha=1},mt=({image:e,primaryColor:t,secondaryColor:n,onDrawn:r})=>{let i=(0,I.useRef)(null),[a,o]=(0,I.useState)(null);(0,I.useLayoutEffect)(()=>{let e=i.current;if(!e)return;let t=()=>{let t=e.clientWidth,n=e.clientHeight;o(e=>e&&e.width===t&&e.height===n?e:{width:t,height:n})};if(t(),typeof ResizeObserver>`u`)return;let n=new ResizeObserver(t);return n.observe(e),()=>n.disconnect()},[]);let s=(0,I.useRef)(r);(0,I.useLayoutEffect)(()=>{s.current=r});let c=(0,I.useRef)(!1),l=(0,I.useRef)(null);return(0,I.useLayoutEffect)(()=>{let r=i.current;if(!r||!a)return;if(a.width>0&&a.height>0){let i=Math.max(1,Math.round(it*a.height/a.width));(r.width!==it||r.height!==i)&&(r.width=it,r.height=i);let o=l.current;e?(!o||o.image!==e||o.width!==r.width||o.height!==r.height||o.cssWidth!==a.width)&&(o={image:e,width:r.width,height:r.height,cssWidth:a.width,canvas:ft(e,r.width,r.height,a.width)}):o=null,l.current=o,pt(r,o?.canvas??null,t,n)}if(c.current)return;let o=requestAnimationFrame(()=>{c.current=!0,s.current()});return()=>cancelAnimationFrame(o)},[a,e,t,n]),(0,L.jsx)(`canvas`,{ref:i,"aria-hidden":`true`,className:`absolute inset-0 w-full h-full`})},ht=(0,I.memo)(({coverUrl:e,theme:t})=>{let n=(0,I.useMemo)(nt,[]),[r,i]=(0,I.useState)(null),[a,o]=$e([t.primaryColor,t.secondaryColor],ot);(0,I.useEffect)(()=>{let t=!1;return!n||!e?(i(null),()=>{t=!0}):(i(null),rt(e).then(e=>{t||i(e)}),()=>{t=!0})},[e,n]);let s=Ge(),c=(0,I.useRef)(0),[l,u]=(0,I.useState)([]),[d,f]=(0,I.useState)(()=>new Set),p=(0,I.useRef)(new Set);(0,I.useEffect)(()=>{let e=new Set(l.map(e=>e.image));p.current.forEach(t=>{e.has(t)||(t.close(),p.current.delete(t))})},[l]),(0,I.useEffect)(()=>()=>{p.current.forEach(e=>e.close()),p.current.clear()},[]),(0,I.useEffect)(()=>{if(n)return;if(!e){u([]);return}let t=!1,r=new Image;return r.decoding=`async`,r.src=e,r.decode().then(()=>{let e=Math.min(1,at/Math.max(r.naturalWidth,r.naturalHeight));return createImageBitmap(r,{resizeWidth:Math.max(1,Math.round(r.naturalWidth*e)),resizeHeight:Math.max(1,Math.round(r.naturalHeight*e)),resizeQuality:`high`})}).then(n=>{if(t){n.close();return}p.current.add(n),u(t=>{let r=t[t.length-1];return r&&r.sourceCover===e?t:(c.current+=1,[...r?[r]:[],{image:n,sourceCover:e,key:c.current}])})},()=>{t||(u(t=>t.length>0?t:(c.current+=1,[{image:null,sourceCover:e,key:c.current}])),s())}),()=>{t=!0}},[e,n,s]);let m=qe(),h=(0,I.useRef)(m);(0,I.useLayoutEffect)(()=>{h.current=m});let[g,_]=(0,I.useState)(null);(0,I.useEffect)(()=>{(!e||n)&&s()},[e,n,s]);let v=(0,I.useCallback)(e=>{h.current&&_(e),f(t=>t.has(e)?t:new Set(t).add(e)),s()},[s]),[y,b]=(0,I.useState)(null),x=l[l.length-1],S=!!e&&!n&&!(x&&x.sourceCover===e&&x.key===y),C=n?r??e??null:null,T=n&&!!r,E=(0,I.useMemo)(()=>({transform:`scale(${T?1.28:1.2}) translateZ(0)`,opacity:T?.94:.3,willChange:`transform, opacity`,backfaceVisibility:`hidden`,WebkitBackfaceVisibility:`hidden`}),[T]);return(0,L.jsxs)(`div`,{className:`absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-0`,style:{isolation:`isolate`,contain:`paint`,transform:`translateZ(0)`},...S?{[ke]:``}:{},children:[e?(0,L.jsxs)(L.Fragment,{children:[n?(0,L.jsx)(`img`,{src:C??e,alt:``,"aria-hidden":`true`,draggable:!1,decoding:`async`,className:`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-out`,style:E}):(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`div`,{className:`absolute inset-0 w-full h-full transition-colors duration-1000`,style:{backgroundColor:t.backgroundColor,opacity:.8}}),l.map((e,t)=>{let n=t===l.length-1,r=d.has(e.key);return(0,L.jsx)(w.div,{className:`absolute inset-0 w-full h-full`,style:{willChange:`opacity`},initial:{opacity:+!n},animate:{opacity:n&&!r?0:1},transition:{duration:e.key===g?0:1.5,ease:`easeInOut`},onAnimationComplete:()=>{n&&r&&(u(t=>t.filter(t=>t.key===e.key)),f(t=>t.has(e.key)?new Set([e.key]):t),b(e.key))},children:(0,L.jsx)(mt,{image:e.image,primaryColor:a,secondaryColor:o,onDrawn:()=>v(e.key)})},e.key)})]}),n&&(0,L.jsxs)(L.Fragment,{children:[!T&&(0,L.jsx)(`img`,{src:e,alt:``,"aria-hidden":`true`,draggable:!1,decoding:`async`,className:`absolute inset-0 w-full h-full object-cover`,style:{transform:`scale(1.36) translateZ(0)`,opacity:.12,willChange:`transform, opacity`,backfaceVisibility:`hidden`,WebkitBackfaceVisibility:`hidden`}}),(0,L.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{backgroundColor:t.backgroundColor,opacity:.28}}),(0,L.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{background:`radial-gradient(circle at 20% 20%, ${t.accentColor}55 0%, transparent 42%), radial-gradient(circle at 80% 28%, ${t.secondaryColor}50 0%, transparent 44%), radial-gradient(circle at 50% 78%, ${t.primaryColor}28 0%, transparent 52%)`,opacity:T?.52:.7}})]})]}):(0,L.jsx)(`div`,{className:`absolute inset-0 w-full h-full transition-colors duration-1000`,style:{backgroundColor:t.backgroundColor,opacity:.8}}),(!e||n||x&&!x.image)&&(0,L.jsx)(`div`,{className:`absolute inset-0 w-full h-full`,style:{background:`linear-gradient(to bottom right, ${a}, transparent, ${o})`,opacity:n?.2:.4,mixBlendMode:n?`normal`:`overlay`}})]})},(e,t)=>{if(e.coverUrl!==t.coverUrl)return!1;let n=e.theme,r=t.theme;return n.backgroundColor===r.backgroundColor&&n.primaryColor===r.primaryColor&&n.secondaryColor===r.secondaryColor});h();var gt=null,_t=null,vt=!1,yt=new Map,bt=new Map,xt=new Set,St=new Set,Ct=0,wt=e=>typeof e==`object`&&!!e&&`$$typeof`in e&&`render`in e,Tt=e=>e.replace(/(?:^|-)(\w)/g,(e,t)=>t.toUpperCase()),Et=e=>{let t=new Map,n=new Map,r=Object.keys(e);return[e=>e,e=>`${e}Icon`,e=>`Lucide${e}`].forEach(e=>{r.forEach(r=>{let i=e(Tt(r));t.has(i)||(t.set(i,r),n.has(i.toLowerCase())||n.set(i.toLowerCase(),i))})}),{loaders:e,keysByName:t,namesByLowercase:n}},Dt=()=>{Ct+=1,St.forEach(e=>e())},Ot=()=>(_t??=m(()=>import(`./dynamicIconImports-BWIKVT_H.js`).then(e=>e.t).then(e=>(gt=Et(e.default),vt=!1,Dt(),gt)),__vite__mapDeps([0,1,2,3])).catch(e=>{throw _t=null,vt=!0,Dt(),e}),_t),kt=(e,t)=>{if(yt.has(t))return Promise.resolve();let n=bt.get(t);return n||(n=e.loaders[t]().then(e=>{wt(e.default)&&(yt.set(t,e.default),xt.delete(t),Dt())}).catch(()=>{xt.add(t),Dt()}).finally(()=>bt.delete(t)),bt.set(t,n)),n},At=e=>typeof e==`string`?e.trim():``,jt=async e=>{let t=(e??[]).map(At).filter(Boolean);if(t.length===0)return;let n;try{n=await Ot()}catch{return}await Promise.all(t.map(e=>{let t=n.keysByName.has(e)?e:n.namesByLowercase.get(e.toLowerCase()),r=t?n.keysByName.get(t):void 0;return r?kt(n,r):void 0}))},Mt=async e=>{let t=At(e);if(!t)return!1;try{return(await Ot()).keysByName.has(t)}catch{return!1}},Nt=e=>{let t=gt?.keysByName.get(At(e));return t?yt.get(t)??null:null},Pt=e=>{let t=Nt(e);if(!t||typeof t.render!=`function`)return null;try{let e=t.render({},null),n=e?.props?.iconNode??e?.props?.icon?.node;return Array.isArray(n)?n:null}catch{return null}},Ft=e=>{let t=At(e);if(!t)return`missing`;if(!gt)return vt?`missing`:`loading`;let n=gt.keysByName.get(t);return n?yt.has(n)?`ready`:xt.has(n)?`missing`:`loading`:`missing`},It=e=>[...new Set((e??[]).map(e=>typeof e==`string`?gt?.namesByLowercase.get(e.trim().toLowerCase()):void 0).filter(e=>e!==void 0&&Nt(e)!==null))],Lt=e=>(St.add(e),()=>{St.delete(e)}),Rt=()=>Ct,zt=e=>{let t=e?.join(`
`)??``;return(0,I.useEffect)(()=>{t&&jt(t.split(`
`))},[t]),(0,I.useSyncExternalStore)(Lt,Rt,Rt)};_();var Bt=e=>{switch(e.type){case`circle`:return`bass`;case`square`:return`lowMid`;case`triangle`:return`mid`;case`cross`:return`treble`;default:return`default`}},Vt=e=>e===`triangle`?`polygon(50% 0%, 0% 100%, 100% 100%)`:e===`cross`?`polygon(20% 0%, 0% 20%, 30% 50%, 0% 80%, 20% 100%, 50% 70%, 80% 100%, 100% 80%, 70% 50%, 100% 20%, 80% 0%, 50% 30%)`:`none`,Ht=(e,t)=>{let n=(e.type===`circle`||e.type===`square`)&&!e.filled;return{border:n?`1px solid ${t.secondaryColor}`:`none`,backgroundColor:n?`transparent`:t.secondaryColor,borderRadius:e.type===`circle`?`50%`:`0%`,opacity:e.opacity,clipPath:Vt(e.type)}},Ut=e=>({left:`${e.initialX}%`,top:`${e.initialY}%`,width:e.size,height:e.size,animationDuration:`${e.duration}s`,animationDelay:`${e.delay}s`,"--geometric-dir":e.reverse?-1:1,"--geometric-rotate":`${e.initialRotation}deg`}),Wt=(e,t)=>{if(e.iconSlot===null||t.length===0)return null;let n=t[Math.floor(e.iconSlot*t.length)];return Ft(n)===`loading`?`loading`:Nt(n)},Gt=({disabled:e=!1})=>e?null:(0,L.jsx)(`div`,{className:`absolute inset-0 pointer-events-none`,style:{background:`radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%)`}}),Kt=({theme:e,audioPower:t,audioBands:n,shapes:r,particles:i,hideShapes:a,disableVignette:o,paused:s})=>{let c=e=>{let n=v(e||t,{stiffness:300,damping:30});return S(n,[10,200],[.95,1.45])},l={bass:c(n?.bass),lowMid:c(n?.lowMid),mid:c(n?.mid),vocal:c(n?.vocal),treble:c(n?.treble),default:c(t)},u=e.lyricsIcons||[];return(0,L.jsxs)(`div`,{className:s?`absolute inset-0 geometric-paused`:`absolute inset-0`,children:[!a&&(0,L.jsxs)(L.Fragment,{children:[r.map(t=>{let n=Wt(t,u),r=n===`loading`?null:n;return(0,L.jsxs)(`div`,{className:`absolute geometric-drift`,style:Ut(t),children:[(0,L.jsx)(w.div,{className:`w-full h-full transition-[color,background-color,border-color,opacity] duration-1000`,style:{...Ht(t,e),...n===null?{}:{opacity:0},scale:l[Bt(t)]}}),t.iconSlot!==null&&(0,L.jsx)(`div`,{className:`absolute inset-0 transition-opacity duration-1000`,style:{opacity:+!!r},children:(0,L.jsx)(w.div,{className:`w-full h-full flex items-center justify-center geometric-pulse transition-colors duration-1000`,style:{color:e.secondaryColor,scale:l.vocal,animationDuration:`${t.duration*.5}s`,animationDelay:`${t.delay}s`,"--geometric-peak":t.opacity*3},children:r&&(0,L.jsx)(r,{size:t.size,strokeWidth:1,absoluteStrokeWidth:!0})})})]},t.id)}),i.map(t=>(0,L.jsx)(`div`,{className:`absolute rounded-full geometric-rise transition-colors duration-1000`,style:{backgroundColor:e.accentColor,width:t.size,height:t.size,left:`${t.left}%`,top:`${t.top}%`,animationDuration:`${t.duration}s`,animationDelay:`${t.delay}s`,"--geometric-peak":t.opacity}},`p-${t.id}`))]}),(0,L.jsx)(Gt,{disabled:o})]})},qt=({theme:e,audioPower:t,audioBands:n,seed:r,hideShapes:i=!1,disableVignette:a=!1,paused:o=!1})=>{zt(e.lyricsIcons);let s=(0,I.useMemo)(()=>{let e=[`circle`,`square`,`triangle`,`cross`],t=0;return Array.from({length:15}).map((n,r)=>{let i=t<6&&Math.random()>.7?Math.random():null;return i!==null&&(t+=1),{id:r,type:e[Math.floor(Math.random()*e.length)],iconSlot:i,initialX:Math.random()*100,initialY:Math.random()*100,size:40+Math.random()*100,duration:i===null?30+Math.random()*30:20+Math.random()*20,delay:Math.random()*5,opacity:.11+Math.random()*.08,reverse:Math.random()>.5,filled:Math.random()<.3,initialRotation:Math.random()*360}})},[r]),c=(0,I.useMemo)(()=>Array.from({length:20}).map((e,t)=>({id:t,size:Math.random()*4+1,left:Math.random()*100,top:Math.random()*100,opacity:Math.random()*.3,duration:15+Math.random()*20,delay:Math.random()*10})),[r]);return(0,L.jsx)(w.div,{className:`absolute inset-0`,initial:!1,animate:{opacity:1},exit:{opacity:0},transition:{duration:.6,ease:`easeInOut`},children:(0,L.jsx)(Kt,{theme:e,audioPower:t,audioBands:n,shapes:s,particles:c,hideShapes:i,disableVignette:a,paused:o})})},Jt=I.memo(e=>{let t=String(e.seed??`default`);return(0,L.jsx)(`div`,{className:`absolute inset-0 overflow-hidden pointer-events-none`,children:(0,L.jsx)(C,{mode:`sync`,children:(0,L.jsx)(qt,{...e},t)})})},(e,t)=>{if(e.seed!==t.seed||e.audioPower!==t.audioPower||e.hideShapes!==t.hideShapes||e.disableVignette!==t.disableVignette||e.paused!==t.paused)return!1;let n=e.audioBands,r=t.audioBands;if(!n!=!r)return!1;let i=!0;if(n&&r&&(i=n.bass===r.bass&&n.lowMid===r.lowMid&&n.mid===r.mid&&n.vocal===r.vocal&&n.treble===r.treble),!i)return!1;let a=e.theme,o=t.theme,s=a.backgroundColor===o.backgroundColor&&a.primaryColor===o.primaryColor&&a.secondaryColor===o.secondaryColor&&a.accentColor===o.accentColor,c=!!(a.lyricsIcons===o.lyricsIcons||a.lyricsIcons?.length===o.lyricsIcons?.length&&a.lyricsIcons?.every((e,t)=>e===o.lyricsIcons?.[t]));return s&&c}),Yt=t({default:()=>Xt}),Xt=ve({mode:`common`,order:10,labelKey:`options.visualizerBackgroundModeCommon`,labelFallback:`Common`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`path`,{d:`M4 17l5-8 5 8z`}),(0,L.jsx)(`circle`,{cx:`17.5`,cy:`8.5`,r:`3`,opacity:`0.55`})]}),command:{title:`Background: Common`,description:`Switch background to general layout`,keywords:[`background general`,`common`,`general`,`通用背景`,`ty`,`背景切换到 通用`,`背景切换到通用`]},song:({config:e,coverUrl:t,seed:n,staticMode:r})=>[r?null:n??null,e?.common?.useCoverColorBg?t??null:null],render:({config:e,theme:t,coverUrl:n,audioPower:r,audioBands:i,seed:a,staticMode:o,paused:s})=>{let c=e?.common,l=c?.useCoverColorBg??!1;return(0,L.jsxs)(L.Fragment,{children:[l&&(0,L.jsx)(`div`,{className:`absolute inset-0 z-0`,children:(0,L.jsx)(ht,{coverUrl:n,theme:t})}),(0,L.jsx)(`div`,{className:`absolute inset-0 z-0 transition-all duration-1000`,style:{backgroundColor:t.backgroundColor,opacity:l?c?.opacity??.75:1}}),!o&&(0,L.jsx)(`div`,{className:`absolute inset-0 z-0`,children:(0,L.jsx)(Jt,{theme:t,audioPower:r,audioBands:i,seed:a,hideShapes:c?.disableGeometricBackground??!1,disableVignette:c?.disableVignette??!1,paused:s})})]})},renderSettingsPanel:e=>(0,L.jsx)(xe,{...e}),renderQuickControls:({config:e,actions:t,t:n})=>{let r=e?.common?.useCoverColorBg??!1,i=!(e?.common?.disableVignette??!1);return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(ce,{active:r,label:n(r?`theme.addCoverColor`:`theme.useDefaultColor`),onToggle:()=>t?.common?.onCoverColorChange?.(!r),children:(0,L.jsx)(s,{size:14})}),(0,L.jsx)(ce,{active:i,label:n(`options.visualizerVignette`),onToggle:()=>t?.common?.onDisableVignetteChange?.(i),children:(0,L.jsx)(u,{size:14})})]})},resetSettings:e=>{e?.common?.onOpacityChange?.(.75),e?.common?.onCoverColorChange?.(!1),e?.common?.onDisableVignetteChange?.(!1),e?.common?.onDisableGeometricChange?.(!1)}}),Zt=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  #ifdef ADD_HELPERS
  v_responsiveHelperBox = uv;
  v_responsiveHelperBox *= responsiveBoxScale;
  v_responsiveHelperBox += boxOrigin * (responsiveBoxScale - 1.);
  #endif

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,Qt=8294400,$t=class{parentElement;canvasElement;gl;program=null;uniformLocations={};fragmentShader;rafId=null;lastRenderTime=0;currentFrame=0;speed=0;currentSpeed=0;providedUniforms;mipmaps=[];hasBeenDisposed=!1;resolutionChanged=!0;textures=new Map;minPixelRatio;maxPixelCount;isSafari=rn();uniformCache={};textureUnitMap=new Map;ownerDocument;constructor(e,t,n,r,i=0,a=0,o=2,s=Qt,c=[]){if(e?.nodeType===1)this.parentElement=e;else throw Error(`Paper Shaders: parent element must be an HTMLElement`);if(this.ownerDocument=e.ownerDocument,!this.ownerDocument.querySelector(`style[data-paper-shader]`)){let e=this.ownerDocument.createElement(`style`);e.innerHTML=nn,e.setAttribute(`data-paper-shader`,``),this.ownerDocument.head.prepend(e)}let l=this.ownerDocument.createElement(`canvas`);this.canvasElement=l,this.parentElement.prepend(l),this.fragmentShader=t,this.providedUniforms=n,this.mipmaps=c,this.currentFrame=a,this.minPixelRatio=o,this.maxPixelCount=s;let u=l.getContext(`webgl2`,r);if(!u)throw Error(`Paper Shaders: WebGL is not supported in this browser`);this.gl=u,this.initProgram(),this.setupPositionAttribute(),this.setupUniforms(),this.setUniformValues(this.providedUniforms),this.setupResizeObserver(),visualViewport?.addEventListener(`resize`,this.handleVisualViewportChange),this.setupIntersectionObserver(),this.setSpeed(i),this.parentElement.setAttribute(`data-paper-shader`,``),this.parentElement.paperShaderMount=this,this.ownerDocument.addEventListener(`visibilitychange`,this.handleDocumentVisibilityChange)}initProgram=()=>{let e=tn(this.gl,Zt,this.fragmentShader);e&&(this.program=e)};setupPositionAttribute=()=>{let e=this.gl.getAttribLocation(this.program,`a_position`),t=this.gl.createBuffer();this.gl.bindBuffer(this.gl.ARRAY_BUFFER,t),this.gl.bufferData(this.gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),this.gl.STATIC_DRAW),this.gl.enableVertexAttribArray(e),this.gl.vertexAttribPointer(e,2,this.gl.FLOAT,!1,0,0)};setupUniforms=()=>{let e={u_time:this.gl.getUniformLocation(this.program,`u_time`),u_pixelRatio:this.gl.getUniformLocation(this.program,`u_pixelRatio`),u_resolution:this.gl.getUniformLocation(this.program,`u_resolution`)};Object.entries(this.providedUniforms).forEach(([t,n])=>{if(e[t]=this.gl.getUniformLocation(this.program,t),n instanceof HTMLImageElement){let n=`${t}AspectRatio`;e[n]=this.gl.getUniformLocation(this.program,n)}}),this.uniformLocations=e};renderScale=1;parentWidth=0;parentHeight=0;parentDevicePixelWidth=0;parentDevicePixelHeight=0;devicePixelsSupported=!1;intersectionObserver=null;isInViewport=!0;resizeObserver=null;setupResizeObserver=()=>{this.resizeObserver=new ResizeObserver(([e])=>{if(e?.borderBoxSize[0]){let t=e.devicePixelContentBoxSize?.[0];t!==void 0&&(this.devicePixelsSupported=!0,this.parentDevicePixelWidth=t.inlineSize,this.parentDevicePixelHeight=t.blockSize),this.parentWidth=e.borderBoxSize[0].inlineSize,this.parentHeight=e.borderBoxSize[0].blockSize}this.handleResize()}),this.resizeObserver.observe(this.parentElement)};setupIntersectionObserver=()=>{let e=this.ownerDocument.defaultView;e?.IntersectionObserver&&(this.intersectionObserver=new e.IntersectionObserver(([e])=>{this.isInViewport=e?.isIntersecting??!0,this.updateCurrentSpeed()}),this.intersectionObserver.observe(this.parentElement))};handleVisualViewportChange=()=>{this.resizeObserver?.disconnect(),this.setupResizeObserver()};handleResize=()=>{let e=0,t=0,n=Math.max(1,window.devicePixelRatio),r=visualViewport?.scale??1;if(this.devicePixelsSupported){let i=Math.max(1,this.minPixelRatio/n);e=this.parentDevicePixelWidth*i*r,t=this.parentDevicePixelHeight*i*r}else{let i=Math.max(n,this.minPixelRatio)*r;if(this.isSafari){let e=an(this.ownerDocument);i*=Math.max(1,e)}e=Math.round(this.parentWidth)*i,t=Math.round(this.parentHeight)*i}let i=Math.sqrt(this.maxPixelCount)/Math.sqrt(e*t),a=Math.min(1,i),o=Math.round(e*a),s=Math.round(t*a),c=o/Math.round(this.parentWidth);(this.canvasElement.width!==o||this.canvasElement.height!==s||this.renderScale!==c)&&(this.renderScale=c,this.canvasElement.width=o,this.canvasElement.height=s,this.resolutionChanged=!0,this.gl.viewport(0,0,this.gl.canvas.width,this.gl.canvas.height),this.render(performance.now()))};render=e=>{if(this.hasBeenDisposed)return;if(this.program===null){console.warn(`Tried to render before program or gl was initialized`);return}let t=e-this.lastRenderTime;this.lastRenderTime=e,this.currentSpeed!==0&&(this.currentFrame+=t*this.currentSpeed),this.gl.clear(this.gl.COLOR_BUFFER_BIT),this.gl.useProgram(this.program),this.gl.uniform1f(this.uniformLocations.u_time,this.currentFrame*.001),this.resolutionChanged&&=(this.gl.uniform2f(this.uniformLocations.u_resolution,this.gl.canvas.width,this.gl.canvas.height),this.gl.uniform1f(this.uniformLocations.u_pixelRatio,this.renderScale),!1),this.gl.drawArrays(this.gl.TRIANGLES,0,6),this.currentSpeed===0?this.rafId=null:this.requestRender()};requestRender=()=>{this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=requestAnimationFrame(this.render)};setTextureUniform=(e,t)=>{if(!t.complete||t.naturalWidth===0)throw Error(`Paper Shaders: image for uniform ${e} must be fully loaded`);let n=this.textures.get(e);n&&this.gl.deleteTexture(n),this.textureUnitMap.has(e)||this.textureUnitMap.set(e,this.textureUnitMap.size);let r=this.textureUnitMap.get(e);this.gl.activeTexture(this.gl.TEXTURE0+r);let i=this.gl.createTexture();this.gl.bindTexture(this.gl.TEXTURE_2D,i),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_S,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_WRAP_T,this.gl.CLAMP_TO_EDGE),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MAG_FILTER,this.gl.LINEAR),this.gl.texImage2D(this.gl.TEXTURE_2D,0,this.gl.RGBA,this.gl.RGBA,this.gl.UNSIGNED_BYTE,t),this.mipmaps.includes(e)&&(this.gl.generateMipmap(this.gl.TEXTURE_2D),this.gl.texParameteri(this.gl.TEXTURE_2D,this.gl.TEXTURE_MIN_FILTER,this.gl.LINEAR_MIPMAP_LINEAR));let a=this.gl.getError();if(a!==this.gl.NO_ERROR||i===null){console.error(`Paper Shaders: WebGL error when uploading texture:`,a);return}this.textures.set(e,i);let o=this.uniformLocations[e];if(o){this.gl.uniform1i(o,r);let n=`${e}AspectRatio`,i=this.uniformLocations[n];if(i){let e=t.naturalWidth/t.naturalHeight;this.gl.uniform1f(i,e)}}};areUniformValuesEqual=(e,t)=>e===t?!0:Array.isArray(e)&&Array.isArray(t)&&e.length===t.length?e.every((e,n)=>this.areUniformValuesEqual(e,t[n])):!1;setUniformValues=e=>{this.gl.useProgram(this.program),Object.entries(e).forEach(([e,t])=>{let n=t;if(t instanceof HTMLImageElement&&(n=`${t.src.slice(0,200)}|${t.naturalWidth}x${t.naturalHeight}`),this.areUniformValuesEqual(this.uniformCache[e],n))return;this.uniformCache[e]=n;let r=this.uniformLocations[e];if(!r){console.warn(`Uniform location for ${e} not found`);return}if(t instanceof HTMLImageElement)this.setTextureUniform(e,t);else if(Array.isArray(t)){let n=null,i=null;if(t[0]!==void 0&&Array.isArray(t[0])){let r=t[0].length;if(t.every(e=>e.length===r))n=t.flat(),i=r;else{console.warn(`All child arrays must be the same length for ${e}`);return}}else n=t,i=n.length;switch(i){case 2:this.gl.uniform2fv(r,n);break;case 3:this.gl.uniform3fv(r,n);break;case 4:this.gl.uniform4fv(r,n);break;case 9:this.gl.uniformMatrix3fv(r,!1,n);break;case 16:this.gl.uniformMatrix4fv(r,!1,n);break;default:console.warn(`Unsupported uniform array length: ${i}`)}}else typeof t==`number`?this.gl.uniform1f(r,t):typeof t==`boolean`?this.gl.uniform1i(r,+!!t):console.warn(`Unsupported uniform type for ${e}: ${typeof t}`)})};getCurrentFrame=()=>this.currentFrame;setFrame=e=>{this.currentFrame=e,this.lastRenderTime=performance.now(),this.render(performance.now())};setSpeed=(e=1)=>{this.speed=e,this.updateCurrentSpeed()};updateCurrentSpeed=()=>{this.setCurrentSpeed(this.ownerDocument.hidden||!this.isInViewport?0:this.speed)};setCurrentSpeed=e=>{this.currentSpeed=e,this.rafId===null&&e!==0&&(this.lastRenderTime=performance.now(),this.rafId=requestAnimationFrame(this.render)),this.rafId!==null&&e===0&&(cancelAnimationFrame(this.rafId),this.rafId=null)};setMaxPixelCount=(e=Qt)=>{this.maxPixelCount=e,this.handleResize()};setMinPixelRatio=(e=2)=>{this.minPixelRatio=e,this.handleResize()};setUniforms=e=>{this.setUniformValues(e),this.providedUniforms={...this.providedUniforms,...e},this.render(performance.now())};handleDocumentVisibilityChange=()=>{this.updateCurrentSpeed()};dispose=()=>{this.hasBeenDisposed=!0,this.rafId!==null&&(cancelAnimationFrame(this.rafId),this.rafId=null),this.gl&&this.program&&(this.textures.forEach(e=>{this.gl.deleteTexture(e)}),this.textures.clear(),this.gl.deleteProgram(this.program),this.program=null,this.gl.bindBuffer(this.gl.ARRAY_BUFFER,null),this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER,null),this.gl.bindRenderbuffer(this.gl.RENDERBUFFER,null),this.gl.bindFramebuffer(this.gl.FRAMEBUFFER,null),this.gl.getError()),this.resizeObserver&&=(this.resizeObserver.disconnect(),null),this.intersectionObserver&&=(this.intersectionObserver.disconnect(),null),visualViewport?.removeEventListener(`resize`,this.handleVisualViewportChange),this.ownerDocument.removeEventListener(`visibilitychange`,this.handleDocumentVisibilityChange),this.uniformLocations={},this.canvasElement.remove(),delete this.parentElement.paperShaderMount}};function en(e,t,n){let r=e.createShader(t);return r?(e.shaderSource(r,n),e.compileShader(r),e.getShaderParameter(r,e.COMPILE_STATUS)?r:(console.error(`An error occurred compiling the shaders: `+e.getShaderInfoLog(r)),e.deleteShader(r),null)):null}function tn(e,t,n){let r=e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT),i=r?r.precision:null;i&&i<23&&(t=t.replace(/precision\s+(lowp|mediump)\s+float;/g,`precision highp float;`),n=n.replace(/precision\s+(lowp|mediump)\s+float/g,`precision highp float`).replace(/\b(uniform|varying|attribute)\s+(lowp|mediump)\s+(\w+)/g,`$1 highp $3`));let a=en(e,e.VERTEX_SHADER,t),o=en(e,e.FRAGMENT_SHADER,n);if(!a||!o)return null;let s=e.createProgram();return s?(e.attachShader(s,a),e.attachShader(s,o),e.linkProgram(s),e.getProgramParameter(s,e.LINK_STATUS)?(e.detachShader(s,a),e.detachShader(s,o),e.deleteShader(a),e.deleteShader(o),s):(console.error(`Unable to initialize the shader program: `+e.getProgramInfoLog(s)),e.deleteProgram(s),e.deleteShader(a),e.deleteShader(o),null)):null}var nn=`@layer paper-shaders {
  :where([data-paper-shader]) {
    isolation: isolate;
    position: relative;

    & canvas {
      contain: strict;
      display: block;
      position: absolute;
      inset: 0;
      z-index: -1;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      corner-shape: inherit;
    }
  }
}`;function rn(){let e=navigator.userAgent.toLowerCase();return e.includes(`safari`)&&!e.includes(`chrome`)&&!e.includes(`android`)}function an(e){let t=visualViewport?.scale??1,n=visualViewport?.width??window.innerWidth,r=window.innerWidth-e.documentElement.clientWidth,i=t*n+r,a=outerWidth/i,o=Math.round(100*a);return o%5==0?o/100:o===33?1/3:o===67?2/3:o===133?4/3:a}var R={fit:`contain`,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0},on={fit:`none`,scale:1,rotation:0,offsetX:0,offsetY:0,originX:.5,originY:.5,worldWidth:0,worldHeight:0},sn={none:0,contain:1,cover:2},cn=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,ln=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`,un=`
  float hash11(float p) {
    p = fract(p * 0.3183099) + 0.1;
    p *= p + 19.19;
    return fract(p * p);
  }
`,dn=`
  float hash21(vec2 p) {
    p = fract(p * vec2(0.3183099, 0.3678794)) + 0.1;
    p += dot(p, p + 19.19);
    return fract(p.x * p.y);
  }
`,fn=`
  float randomR(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).r;
  }
`,pn=`
  vec2 randomGB(vec2 p) {
    vec2 uv = floor(p) / 100. + .5;
    return texture(u_noiseTexture, fract(uv)).gb;
  }
`,mn=`
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`,hn=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,gn=`
float fiberRandom(vec2 p) {
  vec2 uv = floor(p) / 100.;
  return texture(u_noiseTexture, fract(uv)).b;
}

float fiberValueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = fiberRandom(i);
  float b = fiberRandom(i + vec2(1.0, 0.0));
  float c = fiberRandom(i + vec2(0.0, 1.0));
  float d = fiberRandom(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float fiberNoiseFbm(in vec2 n, vec2 seedOffset) {
  float total = 0.0, amplitude = 1.;
  for (int i = 0; i < 4; i++) {
    n = rotate(n, .7);
    total += fiberValueNoise(n + seedOffset) * amplitude;
    n *= 2.;
    amplitude *= 0.6;
  }
  return total;
}

float fiberNoise(vec2 uv, vec2 seedOffset) {
  float epsilon = 0.001;
  float n1 = fiberNoiseFbm(uv + vec2(epsilon, 0.0), seedOffset);
  float n2 = fiberNoiseFbm(uv - vec2(epsilon, 0.0), seedOffset);
  float n3 = fiberNoiseFbm(uv + vec2(0.0, epsilon), seedOffset);
  float n4 = fiberNoiseFbm(uv - vec2(0.0, epsilon), seedOffset);
  return length(vec2(n1 - n2, n3 - n4)) / (2.0 * epsilon);
}
`,_n={maxColorCount:10},vn=`#version 300 es
precision mediump float;

uniform float u_time;

uniform vec4 u_colors[${_n.maxColorCount}];
uniform float u_colorsCount;

uniform float u_distortion;
uniform float u_swirl;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_objectUV;
out vec4 fragColor;

${cn}
${ln}
${dn}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float noise(vec2 n, vec2 seedOffset) {
  return valueNoise(n + seedOffset);
}

vec2 getPosition(int i, float t) {
  float a = float(i) * .37;
  float b = .6 + fract(float(i) / 3.) * .9;
  float c = .8 + fract(float(i + 1) / 4.);

  float x = sin(t * b + a);
  float y = cos(t * c + a * 1.5);

  return .5 + .5 * vec2(x, y);
}

void main() {
  vec2 uv = v_objectUV;
  uv += .5;
  vec2 grainUV = uv * 1000.;

  float grain = noise(grainUV, vec2(0.));
  float mixerGrain = .4 * u_grainMixer * (grain - .5);

  const float firstFrameOffset = 41.5;
  float t = .5 * (u_time + firstFrameOffset);

  float radius = smoothstep(0., 1., length(uv - .5));
  float center = 1. - radius;
  for (float i = 1.; i <= 2.; i++) {
    uv.x += u_distortion * center / i * sin(t + i * .4 * smoothstep(.0, 1., uv.y)) * cos(.2 * t + i * 2.4 * smoothstep(.0, 1., uv.y));
    uv.y += u_distortion * center / i * cos(t + i * 2. * smoothstep(.0, 1., uv.x));
  }

  vec2 uvRotated = uv;
  uvRotated -= vec2(.5);
  float angle = 3. * u_swirl * radius;
  uvRotated = rotate(uvRotated, -angle);
  uvRotated += vec2(.5);

  vec3 color = vec3(0.);
  float opacity = 0.;
  float totalWeight = 0.;

  for (int i = 0; i < ${_n.maxColorCount}; i++) {
    if (i >= int(u_colorsCount)) break;

    vec2 pos = getPosition(i, t) + mixerGrain;
    vec3 colorFraction = u_colors[i].rgb * u_colors[i].a;
    float opacityFraction = u_colors[i].a;

    float dist = length(uvRotated - pos);

    dist = pow(dist, 3.5);
    float weight = 1. / (dist + 1e-3);
    color += colorFraction * weight;
    opacity += opacityFraction * weight;
    totalWeight += weight;
  }

  color /= max(1e-4, totalWeight);
  opacity /= max(1e-4, totalWeight);

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,yn=`#version 300 es
precision mediump float;

uniform float u_time;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform float u_pxSize;
uniform vec4 u_colorBack;
uniform vec4 u_colorFront;
uniform float u_shape;
uniform float u_type;

out vec4 fragColor;

${hn}
${cn}
${un}
${dn}

float getSimplexNoise(vec2 uv, float t) {
  float noise = .5 * snoise(uv - vec2(0., .3 * t));
  noise += .5 * snoise(2. * uv + vec2(0., .32 * t));

  return noise;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
0, 8, 2, 10,
12, 4, 14, 6,
3, 11, 1, 9,
15, 7, 13, 5
);

const int bayer8x8[64] = int[64](
0, 32, 8, 40, 2, 34, 10, 42,
48, 16, 56, 24, 50, 18, 58, 26,
12, 44, 4, 36, 14, 46, 6, 38,
60, 28, 52, 20, 62, 30, 54, 22,
3, 35, 11, 43, 1, 33, 9, 41,
51, 19, 59, 27, 49, 17, 57, 25,
15, 47, 7, 39, 13, 45, 5, 37,
63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}


void main() {
  float t = .5 * u_time;

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec2 shapeUV = normalizedUV;

  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 boxSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  
  if (u_shape > 3.5) {
    vec2 objectBoxSize = vec2(0.);
    // fit = none
    objectBoxSize.x = min(boxSize.x, boxSize.y);
    if (u_fit == 1.) { // fit = contain
      objectBoxSize.x = min(u_resolution.x, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      objectBoxSize.x = max(u_resolution.x, u_resolution.y);
    }
    objectBoxSize.y = objectBoxSize.x;
    vec2 objectWorldScale = u_resolution.xy / objectBoxSize;

    shapeUV *= objectWorldScale;
    shapeUV += boxOrigin * (objectWorldScale - 1.);
    shapeUV += vec2(-u_offsetX, u_offsetY);
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
  } else {
    vec2 patternBoxSize = vec2(0.);
    // fit = none
    patternBoxSize.x = patternBoxRatio * min(boxSize.x / patternBoxRatio, boxSize.y);
    float patternWorldNoFitBoxWidth = patternBoxSize.x;
    if (u_fit == 1.) { // fit = contain
      patternBoxSize.x = patternBoxRatio * min(u_resolution.x / patternBoxRatio, u_resolution.y);
    } else if (u_fit == 2.) { // fit = cover
      patternBoxSize.x = patternBoxRatio * max(u_resolution.x / patternBoxRatio, u_resolution.y);
    }
    patternBoxSize.y = patternBoxSize.x / patternBoxRatio;
    vec2 patternWorldScale = u_resolution.xy / patternBoxSize;

    shapeUV += vec2(-u_offsetX, u_offsetY) / patternWorldScale;
    shapeUV += boxOrigin;
    shapeUV -= boxOrigin / patternWorldScale;
    shapeUV *= u_resolution.xy;
    shapeUV /= u_pixelRatio;
    if (u_fit > 0.) {
      shapeUV *= (patternWorldNoFitBoxWidth / patternBoxSize.x);
    }
    shapeUV /= u_scale;
    shapeUV = graphicRotation * shapeUV;
    shapeUV += boxOrigin / patternWorldScale;
    shapeUV -= boxOrigin;
    shapeUV += .5;
  }

  float shape = 0.;
  if (u_shape < 1.5) {
    // Simplex noise
    shapeUV *= .001;

    shape = 0.5 + 0.5 * getSimplexNoise(shapeUV, t);
    shape = smoothstep(0.3, 0.9, shape);

  } else if (u_shape < 2.5) {
    // Warp
    shapeUV *= .003;

    for (float i = 1.0; i < 6.0; i++) {
      shapeUV.x += 0.6 / i * cos(i * 2.5 * shapeUV.y + t);
      shapeUV.y += 0.6 / i * cos(i * 1.5 * shapeUV.x + t);
    }

    shape = .15 / max(0.001, abs(sin(t - shapeUV.y - shapeUV.x)));
    shape = smoothstep(0.02, 1., shape);

  } else if (u_shape < 3.5) {
    // Dots
    shapeUV *= .05;

    float stripeIdx = floor(2. * shapeUV.x / TWO_PI);
    float rand = hash11(stripeIdx * 10.);
    rand = sign(rand - .5) * pow(.1 + abs(rand), .4);
    shape = sin(shapeUV.x) * cos(shapeUV.y - 5. * rand * t);
    shape = pow(abs(shape), 6.);

  } else if (u_shape < 4.5) {
    // Sine wave
    shapeUV *= 4.;

    float wave = cos(.5 * shapeUV.x - 2. * t) * sin(1.5 * shapeUV.x + t) * (.75 + .25 * cos(3. * t));
    shape = 1. - smoothstep(-1., 1., shapeUV.y + wave);

  } else if (u_shape < 5.5) {
    // Ripple

    float dist = length(shapeUV);
    float waves = sin(pow(dist, 1.7) * 7. - 3. * t) * .5 + .5;
    shape = waves;

  } else if (u_shape < 6.5) {
    // Swirl

    float l = length(shapeUV);
    float angle = 6. * atan(shapeUV.y, shapeUV.x) + 4. * t;
    float twist = 1.2;
    float offset = 1. / pow(max(l, 1e-6), twist) + angle / TWO_PI;
    float mid = smoothstep(0., 1., pow(l, twist));
    shape = mix(0., fract(offset), mid);

  } else {
    // Sphere
    shapeUV *= 2.;

    float d = 1. - pow(length(shapeUV), 2.);
    vec3 pos = vec3(shapeUV, sqrt(max(0., d)));
    vec3 lightPos = normalize(vec3(cos(1.5 * t), .8, sin(1.25 * t)));
    shape = .5 + .5 * dot(lightPos, pos);
    shape *= step(0., d);
  }


  int type = int(floor(u_type));
  float dithering = 0.0;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoiseUV), shape);
    } break;
    case 2:
    dithering = getBayerValue(pxSizeUV, 2);
    break;
    case 3:
    dithering = getBayerValue(pxSizeUV, 4);
    break;
    default :
    dithering = getBayerValue(pxSizeUV, 8);
    break;
  }

  dithering -= .5;
  float res = step(.5, shape + dithering);

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);

  fragColor = vec4(color, opacity);
}
`,bn={simplex:1,warp:2,dots:3,wave:4,ripple:5,swirl:6,sphere:7},xn={random:1,"2x2":2,"4x4":3,"8x8":4},Sn=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_contrast;
uniform float u_roughness;
uniform float u_fiber;
uniform float u_fiberSize;
uniform float u_crumples;
uniform float u_crumpleSize;
uniform float u_folds;
uniform float u_foldCount;
uniform float u_drops;
uniform float u_seed;
uniform float u_fade;

uniform sampler2D u_noiseTexture;

in vec2 v_imageUV;

out vec4 fragColor;

float getUvFrame(vec2 uv) {
  float aax = 2. * fwidth(uv.x);
  float aay = 2. * fwidth(uv.y);

  float left   = smoothstep(0., aax, uv.x);
  float right = 1. - smoothstep(1. - aax, 1., uv.x);
  float bottom = smoothstep(0., aay, uv.y);
  float top = 1. - smoothstep(1. - aay, 1., uv.y);

  return left * right * bottom * top;
}

${cn}
${ln}
${fn}
float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = randomR(i);
  float b = randomR(i + vec2(1.0, 0.0));
  float c = randomR(i + vec2(0.0, 1.0));
  float d = randomR(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}
float fbm(vec2 n) {
  float total = 0.0, amplitude = .4;
  for (int i = 0; i < 3; i++) {
    total += valueNoise(n) * amplitude;
    n *= 1.99;
    amplitude *= 0.65;
  }
  return total;
}


float randomG(vec2 p) {
  vec2 uv = floor(p) / 50. + .5;
  return texture(u_noiseTexture, fract(uv)).g;
}
float roughness(vec2 p) {
  p *= .1;
  float o = 0.;
  for (float i = 0.; ++i < 4.; p *= 2.1) {
    vec4 w = vec4(floor(p), ceil(p));
    vec2 f = fract(p);
    o += mix(
    mix(randomG(w.xy), randomG(w.xw), f.y),
    mix(randomG(w.zy), randomG(w.zw), f.y),
    f.x);
    o += .2 / exp(2. * abs(sin(.2 * p.x + .5 * p.y)));
  }
  return o / 3.;
}

${gn}

vec2 randomGB(vec2 p) {
  vec2 uv = floor(p) / 50. + .5;
  return texture(u_noiseTexture, fract(uv)).gb;
}
float crumpledNoise(vec2 t, float pw) {
  vec2 p = floor(t);
  float wsum = 0.;
  float cl = 0.;
  for (int y = -1; y < 2; y += 1) {
    for (int x = -1; x < 2; x += 1) {
      vec2 b = vec2(float(x), float(y));
      vec2 q = b + p;
      vec2 q2 = q - floor(q / 8.) * 8.;
      vec2 c = q + randomGB(q2);
      vec2 r = c - t;
      float w = pow(smoothstep(0., 1., 1. - abs(r.x)), pw) * pow(smoothstep(0., 1., 1. - abs(r.y)), pw);
      cl += (.5 + .5 * sin((q2.x + q2.y * 5.) * 8.)) * w;
      wsum += w;
    }
  }
  return pow(wsum != 0.0 ? cl / wsum : 0.0, .5) * 2.;
}
float crumplesShape(vec2 uv) {
  return crumpledNoise(uv * .25, 16.) * crumpledNoise(uv * .5, 2.);
}


vec2 folds(vec2 uv) {
  vec3 pp = vec3(0.);
  float l = 9.;
  for (float i = 0.; i < 15.; i++) {
    if (i >= u_foldCount) break;
    vec2 rand = randomGB(vec2(i, i * u_seed));
    float an = rand.x * TWO_PI;
    vec2 p = vec2(cos(an), sin(an)) * rand.y;
    float dist = distance(uv, p);
    l = min(l, dist);

    if (l == dist) {
      pp.xy = (uv - p.xy);
      pp.z = dist;
    }
  }
  return mix(pp.xy, vec2(0.), pow(pp.z, .25));
}

float drops(vec2 uv) {
  vec2 iDropsUV = floor(uv);
  vec2 fDropsUV = fract(uv);
  float dropsMinDist = 1.;
  for (int j = -1; j <= 1; j++) {
    for (int i = -1; i <= 1; i++) {
      vec2 neighbor = vec2(float(i), float(j));
      vec2 offset = randomGB(iDropsUV + neighbor);
      offset = .5 + .5 * sin(10. * u_seed + TWO_PI * offset);
      vec2 pos = neighbor + offset - fDropsUV;
      float dist = length(pos);
      dropsMinDist = min(dropsMinDist, dropsMinDist*dist);
    }
  }
  return 1. - smoothstep(.05, .09, pow(dropsMinDist, .5));
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  vec2 imageUV = v_imageUV;
  vec2 patternUV = v_imageUV - .5;
  patternUV = 5. * (patternUV * vec2(u_imageAspectRatio, 1.));

  vec2 roughnessUv = 1.5 * (gl_FragCoord.xy - .5 * u_resolution) / u_pixelRatio;
  float roughness = roughness(roughnessUv + vec2(1., 0.)) - roughness(roughnessUv - vec2(1., 0.));

  vec2 crumplesUV = fract(patternUV * .02 / u_crumpleSize - u_seed) * 32.;
  float crumples = u_crumples * (crumplesShape(crumplesUV + vec2(.05, 0.)) - crumplesShape(crumplesUV));

  vec2 fiberUV = 2. / u_fiberSize * patternUV;
  float fiber = fiberNoise(fiberUV, vec2(0.));
  fiber = .5 * u_fiber * (fiber - 1.);

  vec2 normal = vec2(0.);
  vec2 normalImage = vec2(0.);

  vec2 foldsUV = patternUV * .12;
  foldsUV = rotate(foldsUV, 4. * u_seed);
  vec2 w = folds(foldsUV);
  foldsUV = rotate(foldsUV + .007 * cos(u_seed), .01 * sin(u_seed));
  vec2 w2 = folds(foldsUV);

  float drops = u_drops * drops(patternUV * 2.);

  float fade = u_fade * fbm(.17 * patternUV + 10. * u_seed);
  fade = clamp(8. * fade * fade * fade, 0., 1.);

  w = mix(w, vec2(0.), fade);
  w2 = mix(w2, vec2(0.), fade);
  crumples = mix(crumples, 0., fade);
  drops = mix(drops, 0., fade);
  fiber *= mix(1., .5, fade);
  roughness *= mix(1., .5, fade);

  normal.xy += u_folds * min(5. * u_contrast, 1.) * 4. * max(vec2(0.), w + w2);
  normalImage.xy += u_folds * 2. * w;

  normal.xy += crumples;
  normalImage.xy += 1.5 * crumples;

  normal.xy += 3. * drops;
  normalImage.xy += .2 * drops;

  normal.xy += u_roughness * 1.5 * roughness;
  normal.xy += fiber;

  normalImage += u_roughness * .75 * roughness;
  normalImage += .2 * fiber;

  vec3 lightPos = vec3(1., 2., 1.);
  float res = dot(normalize(vec3(normal, 9.5 - 9. * pow(u_contrast, .1))), normalize(lightPos));

  vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
  float fgOpacity = u_colorFront.a;
  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  float bgOpacity = u_colorBack.a;

  imageUV += .02 * normalImage;
  float frame = getUvFrame(imageUV);
  vec4 image = texture(u_image, imageUV);
  image.rgb += .6 * pow(u_contrast, .4) * (res - .7);

  frame *= image.a;

  vec3 color = fgColor * res;
  float opacity = fgOpacity * res;

  color += bgColor * (1. - opacity);
  opacity += bgOpacity * (1. - opacity);
  opacity = mix(opacity, 1., frame);

  color -= .007 * drops;

  color.rgb = mix(color, image.rgb, frame);

  fragColor = vec4(color, opacity);
}
`,Cn=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_rotation;

uniform vec4 u_colorBack;
uniform vec4 u_colorShadow;
uniform vec4 u_colorHighlight;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_size;
uniform float u_shadows;
uniform float u_angle;
uniform float u_stretch;
uniform float u_shape;
uniform float u_distortion;
uniform float u_highlights;
uniform float u_distortionShape;
uniform float u_shift;
uniform float u_blur;
uniform float u_edges;
uniform float u_marginLeft;
uniform float u_marginRight;
uniform float u_marginTop;
uniform float u_marginBottom;
uniform float u_grainMixer;
uniform float u_grainOverlay;

in vec2 v_imageUV;

out vec4 fragColor;

${cn}
${ln}
${dn}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float getUvFrame(vec2 uv, float softness) {
  float aax = 2. * fwidth(uv.x);
  float aay = 2. * fwidth(uv.y);
  float left   = smoothstep(0., aax + softness, uv.x);
  float right  = 1. - smoothstep(1. - softness - aax, 1., uv.x);
  float bottom = smoothstep(0., aay + softness, uv.y);
  float top    = 1. - smoothstep(1. - softness - aay, 1., uv.y);
  return left * right * bottom * top;
}

const int MAX_RADIUS = 50;
vec4 samplePremultiplied(sampler2D tex, vec2 uv) {
  vec4 c = texture(tex, uv);
  c.rgb *= c.a;
  return c;
}
vec4 getBlur(sampler2D tex, vec2 uv, vec2 texelSize, vec2 dir, float sigma) {
  if (sigma <= .5) return texture(tex, uv);
  int radius = int(min(float(MAX_RADIUS), ceil(3.0 * sigma)));

  float twoSigma2 = 2.0 * sigma * sigma;
  float gaussianNorm = 1.0 / sqrt(TWO_PI * sigma * sigma);

  vec4 sum = samplePremultiplied(tex, uv) * gaussianNorm;
  float weightSum = gaussianNorm;

  for (int i = 1; i <= MAX_RADIUS; i++) {
    if (i > radius) break;

    float x = float(i);
    float w = exp(-(x * x) / twoSigma2) * gaussianNorm;

    vec2 offset = dir * texelSize * x;
    vec4 s1 = samplePremultiplied(tex, uv + offset);
    vec4 s2 = samplePremultiplied(tex, uv - offset);

    sum += (s1 + s2) * w;
    weightSum += 2.0 * w;
  }

  vec4 result = sum / weightSum;
  if (result.a > 0.) {
    result.rgb /= result.a;
  }

  return result;
}

vec2 rotateAspect(vec2 p, float a, float aspect) {
  p.x *= aspect;
  p = rotate(p, a);
  p.x /= aspect;
  return p;
}

float smoothFract(float x) {
  float f = fract(x);
  float w = fwidth(x);

  float edge = abs(f - 0.5) - 0.5;
  float band = smoothstep(-w, w, edge);

  return mix(f, 1.0 - f, band);
}

void main() {

  float patternRotation = -u_angle * PI / 180.;
  float patternSize = mix(200., 5., u_size);

  vec2 uv = v_imageUV;

  vec2 uvMask = gl_FragCoord.xy / u_resolution.xy;
  vec2 sw = vec2(.005);
  vec4 margins = vec4(u_marginLeft, u_marginTop, u_marginRight, u_marginBottom);
  float mask =
  smoothstep(margins[0], margins[0] + sw.x, uvMask.x + sw.x) *
  smoothstep(margins[2], margins[2] + sw.x, 1.0 - uvMask.x + sw.x) *
  smoothstep(margins[1], margins[1] + sw.y, uvMask.y + sw.y) *
  smoothstep(margins[3], margins[3] + sw.y, 1.0 - uvMask.y + sw.y);
  float maskOuter =
  smoothstep(margins[0] - sw.x, margins[0], uvMask.x + sw.x) *
  smoothstep(margins[2] - sw.x, margins[2], 1.0 - uvMask.x + sw.x) *
  smoothstep(margins[1] - sw.y, margins[1], uvMask.y + sw.y) *
  smoothstep(margins[3] - sw.y, margins[3], 1.0 - uvMask.y + sw.y);
  float maskStroke = maskOuter - mask;
  float maskInner =
  smoothstep(margins[0] - 2. * sw.x, margins[0], uvMask.x) *
  smoothstep(margins[2] - 2. * sw.x, margins[2], 1.0 - uvMask.x) *
  smoothstep(margins[1] - 2. * sw.y, margins[1], uvMask.y) *
  smoothstep(margins[3] - 2. * sw.y, margins[3], 1.0 - uvMask.y);
  float maskStrokeInner = maskInner - mask;

  uv -= .5;
  uv *= patternSize;
  uv = rotateAspect(uv, patternRotation, u_imageAspectRatio);

  float curve = 0.;
  float patternY = uv.y / u_imageAspectRatio;
  if (u_shape > 4.5) {
    // pattern
    curve = .5 + .5 * sin(.5 * PI * uv.x) * cos(.5 * PI * patternY);
  } else if (u_shape > 3.5) {
    // zigzag
    curve = 10. * abs(fract(.1 * patternY) - .5);
  } else if (u_shape > 2.5) {
    // wave
    curve = 4. * sin(.23 * patternY);
  } else if (u_shape > 1.5) {
    // lines irregular
    curve = .5 + .5 * sin(.5 * uv.x) * sin(1.7 * uv.x);
  } else {
    // lines
  }

  vec2 UvToFract = uv + curve;
  vec2 fractOrigUV = fract(uv);
  vec2 floorOrigUV = floor(uv);

  float x = smoothFract(UvToFract.x);
  float xNonSmooth = fract(UvToFract.x) + .0001;

  float highlightsWidth = 2. * max(.001, fwidth(UvToFract.x));
  highlightsWidth += 2. * maskStrokeInner;
  float highlights = smoothstep(0., highlightsWidth, xNonSmooth);
  highlights *= smoothstep(1., 1. - highlightsWidth, xNonSmooth);
  highlights = 1. - highlights;
  highlights *= u_highlights;
  highlights = clamp(highlights, 0., 1.);
  highlights *= mask;

  float shadows = pow(x, 1.3);
  float distortion = 0.;
  float fadeX = 1.;
  float frameFade = 0.;

  float aa = fwidth(xNonSmooth);
  aa = max(aa, fwidth(uv.x));
  aa = max(aa, fwidth(UvToFract.x));
  aa = max(aa, .0001);

  if (u_distortionShape == 1.) {
    distortion = -pow(1.5 * x, 3.);
    distortion += (.5 - u_shift);

    frameFade = pow(1.5 * x, 3.);
    aa = max(.2, aa);
    aa += mix(.2, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion = mix(.5, distortion, fadeX);
  } else if (u_distortionShape == 2.) {
    distortion = 2. * pow(x, 2.);
    distortion -= (.5 + u_shift);

    frameFade = pow(abs(x - .5), 4.);
    aa = max(.2, aa);
    aa += mix(.2, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion = mix(.5, distortion, fadeX);
    frameFade = mix(1., frameFade, .5 * fadeX);
  } else if (u_distortionShape == 3.) {
    distortion = pow(2. * (xNonSmooth - .5), 6.);
    distortion -= .25;
    distortion -= u_shift;

    frameFade = 1. - 2. * pow(abs(x - .4), 2.);
    aa = .15;
    aa += mix(.1, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    frameFade = mix(1., frameFade, fadeX);

  } else if (u_distortionShape == 4.) {
    x = xNonSmooth;
    distortion = sin((x + .25) * TWO_PI);
    shadows = .5 + .5 * asin(distortion) / (.5 * PI);
    distortion *= .5;
    distortion -= u_shift;
    frameFade = .5 + .5 * sin(x * TWO_PI);
  } else if (u_distortionShape == 5.) {
    distortion -= pow(abs(x), .2) * x;
    distortion += .33;
    distortion -= 3. * u_shift;
    distortion *= .33;

    frameFade = .3 * (smoothstep(.0, 1., x));
    shadows = pow(x, 2.5);

    aa = max(.1, aa);
    aa += mix(.1, 0., u_size);
    fadeX = smoothstep(0., aa, xNonSmooth) * smoothstep(1., 1. - aa, xNonSmooth);
    distortion *= fadeX;
  }

  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec2 grainUV = v_imageUV - .5;
  grainUV *= (.8 / vec2(length(dudx), length(dudy)));
  grainUV += .5;
  float grain = valueNoise(grainUV);
  grain = smoothstep(.4, .7, grain);
  grain *= u_grainMixer;
  distortion = mix(distortion, 0., grain);

  shadows = min(shadows, 1.);
  shadows += maskStrokeInner;
  shadows *= mask;
  shadows = min(shadows, 1.);
  shadows *= pow(u_shadows, 2.);
  shadows = clamp(shadows, 0., 1.);

  distortion *= 3. * u_distortion;
  frameFade *= u_distortion;

  fractOrigUV.x += distortion;
  floorOrigUV = rotateAspect(floorOrigUV, -patternRotation, u_imageAspectRatio);
  fractOrigUV = rotateAspect(fractOrigUV, -patternRotation, u_imageAspectRatio);

  uv = (floorOrigUV + fractOrigUV) / patternSize;
  uv += pow(maskStroke, 4.);

  uv += vec2(.5);

  uv = mix(v_imageUV, uv, smoothstep(0., .7, mask));
  float blur = mix(0., 50., u_blur);
  blur = mix(0., blur, smoothstep(.5, 1., mask));

  float edgeDistortion = mix(.0, .04, u_edges);
  edgeDistortion += .06 * frameFade * u_edges;
  edgeDistortion *= mask;
  float frame = getUvFrame(uv, edgeDistortion);

  float stretch = 1. - smoothstep(0., .5, xNonSmooth) * smoothstep(1., 1. - .5, xNonSmooth);
  stretch = pow(stretch, 2.);
  stretch *= mask;
  stretch *= getUvFrame(uv, .1 + .05 * mask * frameFade);
  uv.y = mix(uv.y, .5, u_stretch * stretch);

  vec4 image = getBlur(u_image, uv, 1. / u_resolution / u_pixelRatio, vec2(0., 1.), blur);
  image.rgb *= image.a;
  vec4 backColor = u_colorBack;
  backColor.rgb *= backColor.a;
  vec4 highlightColor = u_colorHighlight;
  highlightColor.rgb *= highlightColor.a;
  vec4 shadowColor = u_colorShadow;

  vec3 color = highlightColor.rgb * highlights;
  float opacity = highlightColor.a * highlights;

  shadows = mix(shadows * shadowColor.a, 0., highlights);
  color = mix(color, shadowColor.rgb * shadowColor.a, .5 * shadows);
  color += .5 * pow(shadows, .5) * shadowColor.rgb;
  opacity += shadows;
  color = clamp(color, vec3(0.), vec3(1.));
  opacity = clamp(opacity, 0., 1.);

  color += image.rgb * (1. - opacity) * frame;
  opacity += image.a * (1. - opacity) * frame;

  color += backColor.rgb * (1. - opacity);
  opacity += backColor.a * (1. - opacity);

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  grainOverlayStrength *= mask;
  color = mix(color, grainOverlayColor, .35 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,wn={lines:1,linesIrregular:2,wave:3,zigzag:4,pattern:5},Tn={prism:1,lens:2,contour:3,cascade:4,flat:5},En=`#version 300 es
precision mediump float;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;

uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;
uniform vec4 u_colorHighlight;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_type;
uniform float u_pxSize;
uniform bool u_originalColors;
uniform bool u_inverted;
uniform float u_colorSteps;

out vec4 fragColor;


${dn}
${cn}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;

  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);

  return left * right * bottom * top;
}

vec2 getImageUV(vec2 uv) {
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  float r = u_rotation * PI / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  vec2 imageUV = uv;
  imageUV *= imageBoxScale;
  imageUV += boxOrigin * (imageBoxScale - 1.);
  imageUV += graphicOffset;
  imageUV /= u_scale;
  imageUV.x *= u_imageAspectRatio;
  imageUV = graphicRotation * imageUV;
  imageUV.x /= u_imageAspectRatio;

  imageUV += .5;
  imageUV.y = 1. - imageUV.y;

  return imageUV;
}

const int bayer2x2[4] = int[4](0, 2, 3, 1);
const int bayer4x4[16] = int[16](
0, 8, 2, 10,
12, 4, 14, 6,
3, 11, 1, 9,
15, 7, 13, 5
);

const int bayer8x8[64] = int[64](
0, 32, 8, 40, 2, 34, 10, 42,
48, 16, 56, 24, 50, 18, 58, 26,
12, 44, 4, 36, 14, 46, 6, 38,
60, 28, 52, 20, 62, 30, 54, 22,
3, 35, 11, 43, 1, 33, 9, 41,
51, 19, 59, 27, 49, 17, 57, 25,
15, 47, 7, 39, 13, 45, 5, 37,
63, 31, 55, 23, 61, 29, 53, 21
);

float getBayerValue(vec2 uv, int size) {
  ivec2 pos = ivec2(fract(uv / float(size)) * float(size));
  int index = pos.y * size + pos.x;

  if (size == 2) {
    return float(bayer2x2[index]) / 4.0;
  } else if (size == 4) {
    return float(bayer4x4[index]) / 16.0;
  } else if (size == 8) {
    return float(bayer8x8[index]) / 64.0;
  }
  return 0.0;
}


void main() {

  float pxSize = u_pxSize * u_pixelRatio;
  vec2 pxSizeUV = gl_FragCoord.xy - .5 * u_resolution;
  pxSizeUV /= pxSize;
  vec2 canvasPixelizedUV = (floor(pxSizeUV) + .5) * pxSize;
  vec2 normalizedUV = canvasPixelizedUV / u_resolution;

  vec2 imageUV = getImageUV(normalizedUV);
  vec2 ditheringNoiseUV = canvasPixelizedUV;
  vec4 image = texture(u_image, imageUV);
  float frame = getUvFrame(imageUV, pxSize / u_resolution);

  int type = int(floor(u_type));
  float dithering = 0.0;

  float lum = dot(vec3(.2126, .7152, .0722), image.rgb);
  lum = u_inverted ? (1. - lum) : lum;

  switch (type) {
    case 1: {
      dithering = step(hash21(ditheringNoiseUV), lum);
    } break;
    case 2:
    dithering = getBayerValue(pxSizeUV, 2);
    break;
    case 3:
    dithering = getBayerValue(pxSizeUV, 4);
    break;
    default :
    dithering = getBayerValue(pxSizeUV, 8);
    break;
  }

  float colorSteps = max(floor(u_colorSteps), 1.);
  vec3 color = vec3(0.0);
  float opacity = 1.;

  dithering -= .5;
  float brightness = clamp(lum + dithering / colorSteps, 0.0, 1.0);
  brightness = mix(0.0, brightness, frame);
  brightness = mix(0.0, brightness, image.a);
  float quantLum = floor(brightness * colorSteps + 0.5) / colorSteps;
  quantLum = mix(0.0, quantLum, frame);

  if (u_originalColors == true) {
    vec3 normColor = image.rgb / max(lum, 0.001);
    color = normColor * quantLum;

    float quantAlpha = floor(image.a * colorSteps + 0.5) / colorSteps;
    opacity = mix(quantLum, 1., quantAlpha);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;
    vec3 hlColor = u_colorHighlight.rgb * u_colorHighlight.a;
    float hlOpacity = u_colorHighlight.a;

    fgColor = mix(fgColor, hlColor, step(1.02 - .02 * u_colorSteps, brightness));
    fgOpacity = mix(fgOpacity, hlOpacity, step(1.02 - .02 * u_colorSteps, brightness));

    color = fgColor * quantLum;
    opacity = fgOpacity * quantLum;
    color += bgColor * (1.0 - opacity);
    opacity += bgOpacity * (1.0 - opacity);
  }

  fragColor = vec4(color, opacity);
}
`,Dn=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;
uniform float u_spread;
uniform float u_bias;
uniform float u_angle;
uniform float u_perspective;
uniform float u_count;
uniform float u_dispersion;
uniform float u_dispersionShift;
uniform float u_dispersionColor;
uniform float u_focusCenter;
uniform float u_focusEdges;
uniform float u_swirl;
uniform float u_noise;
uniform float u_noiseFrequency;
uniform float u_noiseOffset;
uniform float u_lensBulge;
uniform float u_lensCircle;
uniform float u_grainMixer;
uniform float u_grainOverlay;
uniform float u_imageX;
uniform float u_imageY;

in vec2 v_imageUV;

out vec4 fragColor;

${cn}
${dn}
${ln}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1., 0.));
  float c = hash21(i + vec2(0., 1.));
  float d = hash21(i + vec2(1., 1.));
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float getUvFrame(vec2 uv) {
  vec2 invAA = 1. / clamp(fwidth(uv), 1e-5, .02);
  vec2 lo = clamp(uv * invAA + .5, 0., 1.);
  vec2 hi = clamp((1. - uv) * invAA + .5, 0., 1.);
  return lo.x * hi.x * lo.y * hi.y;
}

vec4 sampleOverWhite(vec2 uv) {
  vec4 img = texture(u_image, uv);
  float cover = img.a * getUvFrame(uv);
  vec3 colorOverWhite = mix(vec3(1.), img.rgb, cover);
  return vec4(colorOverWhite, cover);
}

vec3 hueColor(float hue) {
  vec3 rgb = clamp(abs(mod(hue * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.);
  rgb = rgb * rgb * (3. - 2. * rgb);
  return rgb;
}
                                            
float boxInradius() {
  return .5 * min(u_imageAspectRatio, 1.);
}

float boxOutradius() {
  return .5 * length(vec2(u_imageAspectRatio, 1.));
}

float spreadReach() {
  return .7 * pow(u_spread, 1.3 + 2.7 * u_spread);
}

float innerCircleMask(float radius, float inradius) {
  return 1. - smoothstep(.5 * inradius, 1.1 * inradius, radius);
}

float dispersionCurve(float t, float biasPow) {
  float mirroredT = u_bias < 0. ? 1. - t : t;
  float curved = pow(mirroredT, biasPow);
  return u_bias < 0. ? 1. - curved : curved;
}

vec2 getSpread(vec2 fromCenter, float radius, vec2 warpedUV, float edgeAA, float inradius, float outradius, float reach, out float outStrength) {
  float angleRad = radians(u_angle);
  vec2 uniformDir = vec2(cos(angleRad), sin(angleRad));

  float invInradius = 1. / inradius;
  vec2 radialDir = fromCenter * invInradius;
  float maxLen = (outradius + reach) * invInradius;
  float radialLen = radius * invInradius;
  if (radialLen > maxLen) radialDir *= maxLen / radialLen;
  vec2 spreadDir = mix(uniformDir, radialDir, u_perspective);

  float bandProximity = smoothstep(inradius * .8, inradius, radius);
  float lensCircleMaxing = bandProximity * u_lensCircle * u_lensCircle * u_lensCircle;
  spreadDir = mix(spreadDir, radialDir, lensCircleMaxing);

  vec2 warpedAbs = abs(warpedUV - .5);
  float inner = mix(1., smoothstep(0., mix(inradius, outradius, u_focusCenter), radius), u_focusCenter);
  float boxDist = max(warpedAbs.x, warpedAbs.y) * 2.;
  float outer = mix(1., 1. - min(boxDist, 1.), u_focusEdges);
  float strength = inner * outer;

  strength *= mix(1., mix(.15, .03, max(-u_lensBulge, 0.)), lensCircleMaxing);

  vec2 outside = max(warpedAbs - .5, 0.);
  float margin = max(reach * length(spreadDir) * (1. - u_lensCircle), edgeAA);
  strength *= 1. - smoothstep(0., margin, length(outside));

  outStrength = strength;
  vec2 axis = spreadDir * (reach * strength);

  if (u_noise > 0.) {
    float turn = (valueNoise(fromCenter * u_noiseFrequency * 18. + u_noiseOffset * 30.) - .5) * 2. * u_noise;
    float cs = cos(turn), sn = sin(turn);
    axis = mat2(cs, -sn, sn, cs) * axis;
  }

  axis.x /= u_imageAspectRatio;
  return axis;
}

vec2 lensWarp(vec2 fromCenter, float radius, float inradius, out float bulgeFade) {
  bulgeFade = 1.;
  if (u_lensBulge == 0. && u_lensCircle <= 0.) return fromCenter;
  if (radius < 1e-5) return fromCenter;
  
  float r = radius;

  if (u_lensBulge != 0.) {
    float rn = radius / inradius;
    float bulge = abs(u_lensBulge) * (u_lensBulge > 0. ? 1.4 : 1.2);
    if (u_lensBulge > 0.) bulgeFade = 1. - smoothstep(1.45, 1.53, rn * bulge);
    float map = u_lensBulge > 0.
      ? tan(min(rn * bulge, 1.53)) / tan(bulge)
      : atan(rn * tan(bulge)) / bulge;
    float bulgeScale = map / rn;
    fromCenter *= bulgeScale;
    r *= bulgeScale;
  }

  if (u_lensCircle > 0.) {
    vec2 dir = fromCenter / max(r, 1e-5);
    vec2 halfBox = vec2(u_imageAspectRatio, 1.) * .5;
    float rBox = min(halfBox.x / max(abs(dir.x), 1e-4), halfBox.y / max(abs(dir.y), 1e-4));
    float band = inradius * mix(.03, .2, .5 * (u_lensBulge + 1.));
    float innerEdge = inradius - band;
    float over = smoothstep(0., 1., (r - innerEdge) / band);
    float g = r + (rBox - inradius) * pow(over, 14.);
    fromCenter = dir * mix(r, g, u_lensCircle);
  }

  return fromCenter;
}

void main() {
  vec2 uv = v_imageUV;

  float invAspect = 1. / u_imageAspectRatio;
  float inradius = boxInradius();
  float outradius = boxOutradius();
  float reach = spreadReach();

  vec2 fromCenter = uv - .5;
  fromCenter.x *= u_imageAspectRatio;
  float radius = length(fromCenter);

  float bulgeFade;
  vec2 warpedFromCenter = lensWarp(fromCenter, radius, inradius, bulgeFade);
  vec2 baseUV = vec2(warpedFromCenter.x * invAspect, warpedFromCenter.y) + .5;

  vec2 baseDerivative = fwidth(baseUV);
  float edgeAA = clamp(2. * max(baseDerivative.x, baseDerivative.y), .001, .02);

  float spreadStrength;
  vec2 spreadAxis = getSpread(fromCenter, radius, baseUV, edgeAA, inradius, outradius, reach, spreadStrength);

  vec2 grainUV = vec2(0.);
  if (u_grainMixer > 0. || u_grainOverlay > 0.) {
    vec2 dudx = dFdx(v_imageUV);
    vec2 dudy = dFdy(v_imageUV);
    grainUV = (v_imageUV - .5) * (.8 / vec2(length(dudx), length(dudy))) + .5;
  }

  if (u_grainMixer > 0.) {
    float grainSeed = valueNoise(grainUV);
    vec2 jit = fract(grainSeed * vec2(157.31, 113.57)) * 2. - 1.;
    spreadAxis += jit * .3 * u_grainMixer * length(spreadAxis);
  }

  float count = floor(u_count);
  int countInteger = int(count);

  float invCount = 1. / count;
  float invSpan = 1. / max(count - 1., 1.);
  float hueBase = u_dispersionColor + .5;
  float biasPower = 1. + 2. * abs(u_bias);
  vec2 tapBias = .5 - vec2(u_imageX, u_imageY);

  float centerAmount = clamp(1. - u_dispersionShift, 0., 1.);
  float edgesAmount = clamp(1. + u_dispersionShift, 0., 1.);
  float dispersion = u_dispersion * mix(edgesAmount, centerAmount, innerCircleMask(radius, inradius));
  float dispersionPower = pow(dispersion, .8);

  float warpedRadius = length(warpedFromCenter);
  float swirlAngle = u_swirl * .4 * PI * spreadStrength * u_spread * min(1., inradius / max(warpedRadius, 1e-4));

  vec3 colorSum = vec3(0.);
  vec3 weightSum = vec3(0.);
  float coverSum = 0.;

  for (int i = 0; i < ${{maxSamples:50}.maxSamples}; i++) {
    if (i >= countInteger) break;

    float layer = float(i);
    float hue = hueBase + layer * invCount;

    float spread = layer * invSpan;
    if (u_bias != 0.) spread = dispersionCurve(spread, biasPower);

    // mix(axis, -axis, spread) is axis scaled by the signed position along the fan
    float fanPos = 1. - 2. * spread;
    vec2 tapUV = baseUV + spreadAxis * fanPos - .5;

    if (u_swirl != 0.) {
      tapUV.x *= u_imageAspectRatio;
      tapUV = rotate(tapUV, swirlAngle * fanPos);
      tapUV.x *= invAspect;
    }

    vec4 tap = sampleOverWhite(tapUV + tapBias);
    vec3 weight = 1. - dispersionPower * hueColor(hue);

    colorSum += tap.rgb * weight;
    weightSum += weight;
    coverSum += tap.a;
  }

  vec3 color = colorSum / max(weightSum, 1e-4);
  float coverAvg = coverSum * invCount;

  float ground = min(color.r, min(color.g, color.b));
  float alpha = max(coverAvg, 1. - ground);
  vec3 premult = max(color - (1. - alpha), 0.);
  fragColor = vec4(premult, alpha) * bulgeFade;

  if (u_grainOverlay > 0.) {
    float grain = valueNoise(rotate(grainUV, 1.) + vec2(3.));
    grain = mix(grain, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
    grain = pow(grain, 1.3);
    float grainV = grain * 2. - 1.;
    float grainStrength = pow(u_grainOverlay * abs(grainV), .8) * fragColor.a;
    fragColor.rgb = mix(fragColor.rgb, vec3(step(0., grainV)) * fragColor.a, .35 * grainStrength);
  }
}
`,On=`#version 300 es
precision mediump float;

uniform float u_rotation;

uniform float u_time;

uniform vec4 u_colorFront;
uniform vec4 u_colorBack;
uniform float u_radius;
uniform float u_contrast;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform float u_size;
uniform float u_grainMixer;
uniform float u_grainOverlay;
uniform float u_grainSize;
uniform float u_grid;
uniform bool u_originalColors;
uniform bool u_inverted;
uniform float u_type;

in vec2 v_imageUV;

out vec4 fragColor;

${cn}
${ln}
${dn}

float valueNoise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x1 = mix(a, b, u.x);
  float x2 = mix(c, d, u.x);
  return mix(x1, x2, u.y);
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

float sst(float edge0, float edge1, float x) {
  return smoothstep(edge0, edge1, x);
}

float getCircle(vec2 uv, float r, float baseR) {
  r = mix(.25 * baseR, 0., r);
  float d = length(uv - .5);
  float aa = fwidth(d);
  return 1. - smoothstep(r - aa, r + aa, d);
}

float getCell(vec2 uv) {
  float insideX = step(0.0, uv.x) * (1.0 - step(1.0, uv.x));
  float insideY = step(0.0, uv.y) * (1.0 - step(1.0, uv.y));
  return insideX * insideY;
}

float getCircleWithHole(vec2 uv, float r, float baseR) {
  float cell = getCell(uv);

  r = mix(.75 * baseR, 0., r);
  float rMod = mod(r, .5);

  float d = length(uv - .5);
  float aa = fwidth(d);
  float circle = 1. - smoothstep(rMod - aa, rMod + aa, d);
  if (r < .5) {
    return circle;
  } else {
    return cell - circle;
  }
}

float getGooeyBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = .3;
  if (u_grid == 1.) {
    sizeRadius = .42;
  }
  sizeRadius = mix(sizeRadius * baseR, 0., r);
  d = 1. - sst(0., sizeRadius, d);

  d = pow(d, 2. + baseR);
  return d;
}

float getSoftBall(vec2 uv, float r, float baseR) {
  float d = length(uv - .5);
  float sizeRadius = clamp(baseR, 0., 1.);
  sizeRadius = mix(.5 * sizeRadius, 0., r);
  d = 1. - lst(0., sizeRadius, d);
  float powRadius = 1. - lst(0., 2., baseR);
  d = pow(d, 4. + 3. * powRadius);
  return d;
}

float getUvFrame(vec2 uv, vec2 pad) {
  float aa = 0.0001;

  float left   = smoothstep(-pad.x, -pad.x + aa, uv.x);
  float right  = smoothstep(1.0 + pad.x, 1.0 + pad.x - aa, uv.x);
  float bottom = smoothstep(-pad.y, -pad.y + aa, uv.y);
  float top    = smoothstep(1.0 + pad.y, 1.0 + pad.y - aa, uv.y);

  return left * right * bottom * top;
}

float sigmoid(float x, float k) {
  return 1.0 / (1.0 + exp(-k * (x - 0.5)));
}

float getLumAtPx(vec2 uv, float contrast) {
  vec4 tex = texture(u_image, uv);
  vec3 color = vec3(
  sigmoid(tex.r, contrast),
  sigmoid(tex.g, contrast),
  sigmoid(tex.b, contrast)
  );
  float lum = dot(vec3(0.2126, 0.7152, 0.0722), color);
  lum = mix(1., lum, tex.a);
  lum = u_inverted ? (1. - lum) : lum;
  return lum;
}

float getLumBall(vec2 p, vec2 pad, vec2 inCellOffset, float contrast, float baseR, float stepSize, out vec4 ballColor) {
  p += inCellOffset;
  vec2 uv_i = floor(p);
  vec2 uv_f = fract(p);
  vec2 samplingUV = (uv_i + .5 - inCellOffset) * pad + vec2(.5);
  float outOfFrame = getUvFrame(samplingUV, pad * stepSize);

  float lum = getLumAtPx(samplingUV, contrast);
  ballColor = texture(u_image, samplingUV);
  ballColor.rgb *= ballColor.a;
  ballColor *= outOfFrame;

  float ball = 0.;
  if (u_type == 0.) {
    // classic
    ball = getCircle(uv_f, lum, baseR);
  } else if (u_type == 1.) {
    // gooey
    ball = getGooeyBall(uv_f, lum, baseR);
  } else if (u_type == 2.) {
    // holes
    ball = getCircleWithHole(uv_f, lum, baseR);
  } else if (u_type == 3.) {
    // soft
    ball = getSoftBall(uv_f, lum, baseR);
  }

  return ball * outOfFrame;
}


void main() {

  float stepMultiplier = 1.;
  if (u_type == 0.) {
    // classic
    stepMultiplier = 2.;
  } else if (u_type == 1. || u_type == 3.) {
    // gooey & soft
    stepMultiplier = 6.;
  }

  float cellsPerSide = mix(300., 7., pow(u_size, .7));
  cellsPerSide /= stepMultiplier;
  float cellSizeY = 1. / cellsPerSide;
  vec2 pad = cellSizeY * vec2(1. / u_imageAspectRatio, 1.);
  if (u_type == 1. && u_grid == 1.) {
    // gooey diagonal grid works differently
    pad *= .7;
  }

  vec2 uv = v_imageUV;
  uv -= vec2(.5);
  uv /= pad;

  float contrast = mix(0., 15., pow(u_contrast, 1.5));
  float baseRadius = u_radius;
  if (u_originalColors == true) {
    contrast = mix(.1, 4., pow(u_contrast, 2.));
    baseRadius = 2. * pow(.5 * u_radius, .3);
  }

  float totalShape = 0.;
  vec3 totalColor = vec3(0.);
  float totalOpacity = 0.;

  vec4 ballColor;
  float shape;
  float stepSize = 1. / stepMultiplier;
  for (float x = -0.5; x < 0.5; x += stepSize) {
    for (float y = -0.5; y < 0.5; y += stepSize) {
      vec2 offset = vec2(x, y);

      if (u_grid == 1.) {
        float rowIndex = floor((y + .5) / stepSize);
        float colIndex = floor((x + .5) / stepSize);
        if (stepSize == 1.) {
          rowIndex = floor(uv.y + y + 1.);
          if (u_type == 1.) {
            colIndex = floor(uv.x + x + 1.);
          }
        }
        if (u_type == 1.) {
          if (mod(rowIndex + colIndex, 2.) == 1.) {
            continue;
          }
        } else {
          if (mod(rowIndex, 2.) == 1.) {
            offset.x += .5 * stepSize;
          }
        }
      }

      shape = getLumBall(uv, pad, offset, contrast, baseRadius, stepSize, ballColor);
      totalColor   += ballColor.rgb * shape;
      totalShape   += shape;
      totalOpacity += shape;
    }
  }

  const float eps = 1e-4;

  totalColor /= max(totalShape, eps);
  totalOpacity /= max(totalShape, eps);

  float finalShape = 0.;
  if (u_type == 0.) {
    finalShape = min(1., totalShape);
  } else if (u_type == 1.) {
    float aa = fwidth(totalShape);
    float th = .5;
    finalShape = smoothstep(th - aa, th + aa, totalShape);
  } else if (u_type == 2.) {
    finalShape = min(1., totalShape);
  } else if (u_type == 3.) {
    finalShape = totalShape;
  }

  vec2 grainSize = mix(2000., 200., u_grainSize) * vec2(1., 1. / u_imageAspectRatio);
  vec2 grainUV = v_imageUV - .5;
  grainUV *= grainSize;
  grainUV += .5;
  float grain = valueNoise(grainUV);
  grain = smoothstep(.55, .7 + .2 * u_grainMixer, grain);
  grain *= u_grainMixer;
  finalShape = mix(finalShape, 0., grain);

  vec3 color = vec3(0.);
  float opacity = 0.;

  if (u_originalColors == true) {
    color = totalColor * finalShape;
    opacity = totalOpacity * finalShape;

    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    color = color + bgColor * (1. - opacity);
    opacity = opacity + u_colorBack.a * (1. - opacity);
  } else {
    vec3 fgColor = u_colorFront.rgb * u_colorFront.a;
    float fgOpacity = u_colorFront.a;
    vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
    float bgOpacity = u_colorBack.a;

    color = fgColor * finalShape;
    opacity = fgOpacity * finalShape;
    color += bgColor * (1. - opacity);
    opacity += bgOpacity * (1. - opacity);
  }

  float grainOverlay = valueNoise(rotate(grainUV, 1.) + vec2(3.));
  grainOverlay = mix(grainOverlay, valueNoise(rotate(grainUV, 2.) + vec2(-1.)), .5);
  grainOverlay = pow(grainOverlay, 1.3);

  float grainOverlayV = grainOverlay * 2. - 1.;
  vec3 grainOverlayColor = vec3(step(0., grainOverlayV));
  float grainOverlayStrength = u_grainOverlay * abs(grainOverlayV);
  grainOverlayStrength = pow(grainOverlayStrength, .8);
  color = mix(color, grainOverlayColor, .5 * grainOverlayStrength);

  opacity += .5 * grainOverlayStrength;
  opacity = clamp(opacity, 0., 1.);

  fragColor = vec4(color, opacity);
}
`,kn={classic:0,gooey:1,holes:2,soft:3},An={square:0,hex:1};function z(e){if(Array.isArray(e))return e.length===4?e:e.length===3?[...e,1]:In;if(typeof e!=`string`)return In;let t,n,r,i=1;if(e.startsWith(`#`))[t,n,r,i]=jn(e);else if(e.startsWith(`rgb`)){let a=Mn(e);if(a===null)return In;[t,n,r,i]=a}else if(e.startsWith(`hsl`)){let a=Nn(e);if(a===null)return In;[t,n,r,i]=Pn(a)}else return console.error(`Unsupported color format`,e),In;return[Fn(t,0,1),Fn(n,0,1),Fn(r,0,1),Fn(i,0,1)]}function jn(e){return e=e.replace(/^#/,``),(e.length===3||e.length===4)&&(e=e.split(``).map(e=>e+e).join(``)),e.length===6&&(e+=`ff`),/^[0-9a-f]{8}$/i.test(e)?[parseInt(e.slice(0,2),16)/255,parseInt(e.slice(2,4),16)/255,parseInt(e.slice(4,6),16)/255,parseInt(e.slice(6,8),16)/255]:(console.warn(`Invalid hex color`),In)}function Mn(e){let t=e.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([0-9.]+))?\s*\)$/i);return t?[parseInt(t[1]??`0`)/255,parseInt(t[2]??`0`)/255,parseInt(t[3]??`0`)/255,t[4]===void 0?1:parseFloat(t[4])]:null}function Nn(e){let t=e.match(/^hsla?\s*\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*(?:,\s*([0-9.]+))?\s*\)$/i);return t?[parseInt(t[1]??`0`),parseInt(t[2]??`0`),parseInt(t[3]??`0`),t[4]===void 0?1:parseFloat(t[4])]:null}function Pn(e){let[t,n,r,i]=e,a=t/360,o=n/100,s=r/100,c,l,u;if(n===0)c=l=u=s;else{let e=(e,t,n)=>(n<0&&(n+=1),n>1&&--n,n<1/6?e+(t-e)*6*n:n<1/2?t:n<2/3?e+(t-e)*(2/3-n)*6:e),t=s<.5?s*(1+o):s+o-s*o,n=2*s-t;c=e(n,t,a+1/3),l=e(n,t,a),u=e(n,t,a-1/3)}return[c,l,u,i]}var Fn=(e,t,n)=>Math.min(Math.max(e,t),n),In=[.5,.5,.5,1];function Ln(){if(typeof window>`u`)return;let e=new Image;return e.src=Rn,e}var Rn=`data:image/png;base64,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`;function zn(e){let t=I.useRef(void 0),n=I.useCallback(t=>{let n=e.map(e=>{if(e!=null){if(typeof e==`function`){let n=e,r=n(t);return typeof r==`function`?r:()=>{n(null)}}return e.current=t,()=>{e.current=null}}});return()=>{n.forEach(e=>e?.())}},e);return I.useMemo(()=>e.every(e=>e==null)?null:e=>{t.current&&=(t.current(),void 0),e!=null&&(t.current=n(e))},e)}function Bn(e){if(e.naturalWidth<1024&&e.naturalHeight<1024){if(e.naturalWidth<1||e.naturalHeight<1)return;let t=e.naturalWidth/e.naturalHeight;e.width=Math.round(t>1?1024*t:1024),e.height=Math.round(t>1?1024:1024/t)}}async function Vn(e){let t={},n=[],r=e=>{try{return e.startsWith(`/`)||new URL(e),!0}catch{return!1}},i=e=>{try{return!e.startsWith(`/`)&&new URL(e,window.location.origin).origin!==window.location.origin}catch{return!1}};return Object.entries(e).forEach(([e,a])=>{if(typeof a==`string`){let o=a||`data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==`;if(!r(o)){console.warn(`Uniform "${e}" has invalid URL "${o}". Skipping image loading.`);return}let s=new Promise((n,r)=>{let a=new Image;i(o)&&(a.crossOrigin=`anonymous`),a.onload=()=>{Bn(a),t[e]=a,n()},a.onerror=()=>{console.error(`Could not set uniforms. Failed to load image at ${o}`),r()},a.src=o});n.push(s)}else if(a instanceof HTMLImageElement){let r=a.decode().then(()=>{Bn(a),t[e]=a});n.push(r)}else t[e]=a}),await Promise.all(n),t}var Hn=(0,I.forwardRef)(function({fragmentShader:e,uniforms:t,webGlContextAttributes:n,speed:r=0,frame:i=0,width:a,height:o,minPixelRatio:s,maxPixelCount:c,mipmaps:l,style:u,...d},f){let[p,m]=(0,I.useState)(!1),h=(0,I.useRef)(null),g=(0,I.useRef)(null),_=(0,I.useRef)(n);(0,I.useEffect)(()=>((async()=>{let n=await Vn(t);h.current&&!g.current&&(g.current=new $t(h.current,e,n,_.current,r,i,s,c,l),m(!0))})(),()=>{g.current?.dispose(),g.current=null}),[e]),(0,I.useEffect)(()=>{let e=!1;return(async()=>{let n=await Vn(t);e||g.current?.setUniforms(n)})(),()=>{e=!0}},[t,p]),(0,I.useEffect)(()=>{g.current?.setSpeed(r)},[r,p]),(0,I.useEffect)(()=>{g.current?.setMaxPixelCount(c)},[c,p]),(0,I.useEffect)(()=>{g.current?.setMinPixelRatio(s)},[s,p]),(0,I.useEffect)(()=>{g.current?.setFrame(i)},[i,p]);let v=zn([h,f]);return(0,L.jsx)(`div`,{ref:v,style:a!==void 0||o!==void 0?{width:typeof a==`string`&&isNaN(+a)===!1?+a:a,height:typeof o==`string`&&isNaN(+o)===!1?+o:o,...u}:u,...d})});Hn.displayName=`ShaderMount`;function Un(e,t){if(Object.keys(e).length!==Object.keys(t).length)return!1;for(let n in e){if(n===`colors`){let n=Array.isArray(e.colors),r=Array.isArray(t.colors);if(!n||!r){if(Object.is(e.colors,t.colors)===!1)return!1;continue}if(e.colors?.length!==t.colors?.length||!e.colors?.every((e,n)=>e===t.colors?.[n]))return!1;continue}if(Object.is(e[n],t[n])===!1)return!1}return!0}var B={name:`Default`,params:{...R,speed:1,frame:0,colors:[`#e0eaff`,`#241d9a`,`#f75092`,`#9f50d3`],distortion:.8,swirl:.1,grainMixer:0,grainOverlay:0}};({...R}),{...R},{...R};var Wn=(0,I.memo)(function({speed:e=B.params.speed,frame:t=B.params.frame,colors:n=B.params.colors,distortion:r=B.params.distortion,swirl:i=B.params.swirl,grainMixer:a=B.params.grainMixer,grainOverlay:o=B.params.grainOverlay,fit:s=B.params.fit,rotation:c=B.params.rotation,scale:l=B.params.scale,originX:u=B.params.originX,originY:d=B.params.originY,offsetX:f=B.params.offsetX,offsetY:p=B.params.offsetY,worldWidth:m=B.params.worldWidth,worldHeight:h=B.params.worldHeight,...g}){let _={u_colors:n.map(z),u_colorsCount:n.length,u_distortion:r,u_swirl:i,u_grainMixer:a,u_grainOverlay:o,u_fit:sn[s],u_rotation:c,u_scale:l,u_offsetX:f,u_offsetY:p,u_originX:u,u_originY:d,u_worldWidth:m,u_worldHeight:h};return(0,L.jsx)(Hn,{...g,speed:e,frame:t,fragmentShader:vn,uniforms:_})},Un),V={name:`Default`,params:{...on,speed:1,frame:0,scale:.6,colorBack:`#000000`,colorFront:`#00b2ff`,shape:`sphere`,type:`4x4`,size:2}};({...on}),{...on},{...R},{...R},{...R};var Gn=(0,I.memo)(function({speed:e=V.params.speed,frame:t=V.params.frame,colorBack:n=V.params.colorBack,colorFront:r=V.params.colorFront,shape:i=V.params.shape,type:a=V.params.type,pxSize:o,size:s=o===void 0?V.params.size:o,fit:c=V.params.fit,scale:l=V.params.scale,rotation:u=V.params.rotation,originX:d=V.params.originX,originY:f=V.params.originY,offsetX:p=V.params.offsetX,offsetY:m=V.params.offsetY,worldWidth:h=V.params.worldWidth,worldHeight:g=V.params.worldHeight,..._}){let v={u_colorBack:z(n),u_colorFront:z(r),u_shape:bn[i],u_type:xn[a],u_pxSize:s,u_fit:sn[c],u_scale:l,u_rotation:u,u_offsetX:p,u_offsetY:m,u_originX:d,u_originY:f,u_worldWidth:h,u_worldHeight:g};return(0,L.jsx)(Hn,{..._,speed:e,frame:t,fragmentShader:yn,uniforms:v})}),H={name:`Default`,params:{...R,fit:`cover`,scale:.6,speed:0,frame:0,colorFront:`#9fadbc`,colorBack:`#ffffff`,contrast:.3,roughness:.4,fiber:.3,fiberSize:.2,crumples:.3,crumpleSize:.35,folds:.65,foldCount:5,fade:0,drops:.2,seed:5.8}};({...R}),{...R},{...R};var Kn=(0,I.memo)(function({speed:e=H.params.speed,frame:t=H.params.frame,colorFront:n=H.params.colorFront,colorBack:r=H.params.colorBack,image:i=``,contrast:a=H.params.contrast,roughness:o=H.params.roughness,fiber:s=H.params.fiber,crumples:c=H.params.crumples,folds:l=H.params.folds,drops:u=H.params.drops,seed:d=H.params.seed,fiberScale:f,fiberSize:p=f===void 0?H.params.fiberSize:.2/f,crumplesScale:m,crumpleSize:h=m===void 0?H.params.crumpleSize:.2/m,blur:g,fade:_=g===void 0?H.params.fade:g,foldsNumber:v,foldCount:y=v===void 0?H.params.foldCount:v,fit:b=H.params.fit,scale:x=H.params.scale,rotation:S=H.params.rotation,originX:C=H.params.originX,originY:w=H.params.originY,offsetX:T=H.params.offsetX,offsetY:E=H.params.offsetY,worldWidth:D=H.params.worldWidth,worldHeight:ee=H.params.worldHeight,...O}){let k=typeof window<`u`&&{u_noiseTexture:Ln()},te={u_image:i,u_colorFront:z(n),u_colorBack:z(r),u_contrast:a,u_roughness:o,u_fiber:s,u_fiberSize:p,u_crumples:c,u_crumpleSize:h,u_foldCount:y,u_folds:l,u_fade:_,u_drops:u,u_seed:d,...k,u_fit:sn[b],u_scale:x,u_rotation:S,u_offsetX:T,u_offsetY:E,u_originX:C,u_originY:w,u_worldWidth:D,u_worldHeight:ee};return(0,L.jsx)(Hn,{...O,speed:e,frame:t,fragmentShader:Sn,mipmaps:[`u_image`],uniforms:te})},Un),U={name:`Default`,params:{...R,fit:`cover`,speed:0,frame:0,colorBack:`#00000000`,colorShadow:`#000000`,colorHighlight:`#ffffff`,shadows:.25,size:.5,angle:0,distortionShape:`prism`,highlights:.1,shape:`lines`,distortion:.5,shift:0,blur:0,edges:.25,stretch:0,margin:0,marginLeft:0,marginRight:0,marginTop:0,marginBottom:0,grainMixer:0,grainOverlay:0}};({...R}),{...R},{...R};var qn=(0,I.memo)(function({speed:e=U.params.speed,frame:t=U.params.frame,colorBack:n=U.params.colorBack,colorShadow:r=U.params.colorShadow,colorHighlight:i=U.params.colorHighlight,image:a=``,shadows:o=U.params.shadows,angle:s=U.params.angle,distortion:c=U.params.distortion,distortionShape:l=U.params.distortionShape,highlights:u=U.params.highlights,shape:d=U.params.shape,shift:f=U.params.shift,blur:p=U.params.blur,edges:m=U.params.edges,margin:h,marginLeft:g=h??U.params.marginLeft,marginRight:_=h??U.params.marginRight,marginTop:v=h??U.params.marginTop,marginBottom:y=h??U.params.marginBottom,grainMixer:b=U.params.grainMixer,grainOverlay:x=U.params.grainOverlay,stretch:S=U.params.stretch,count:C,size:w=C===void 0?U.params.size:(1/(C*1.6))**(1/6)/.7-.5,fit:T=U.params.fit,scale:E=U.params.scale,rotation:D=U.params.rotation,originX:ee=U.params.originX,originY:O=U.params.originY,offsetX:k=U.params.offsetX,offsetY:te=U.params.offsetY,worldWidth:A=U.params.worldWidth,worldHeight:j=U.params.worldHeight,...ne}){let re={u_image:a,u_colorBack:z(n),u_colorShadow:z(r),u_colorHighlight:z(i),u_shadows:o,u_size:w,u_angle:s,u_distortion:c,u_shift:f,u_blur:p,u_edges:m,u_stretch:S,u_distortionShape:Tn[l],u_highlights:u,u_shape:wn[d],u_marginLeft:g,u_marginRight:_,u_marginTop:v,u_marginBottom:y,u_grainMixer:b,u_grainOverlay:x,u_fit:sn[T],u_scale:E,u_rotation:D,u_offsetX:k,u_offsetY:te,u_originX:ee,u_originY:O,u_worldWidth:A,u_worldHeight:j};return(0,L.jsx)(Hn,{...ne,speed:e,frame:t,fragmentShader:Cn,mipmaps:[`u_image`],uniforms:re})}),W={name:`Default`,params:{...R,fit:`cover`,speed:0,frame:0,colorFront:`#94ffaf`,colorBack:`#000c38`,colorHighlight:`#eaff94`,type:`8x8`,size:2,colorSteps:2,originalColors:!1,inverted:!1}};({...R}),{...R},{...R};var Jn=(0,I.memo)(function({speed:e=W.params.speed,frame:t=W.params.frame,colorFront:n=W.params.colorFront,colorBack:r=W.params.colorBack,colorHighlight:i=W.params.colorHighlight,image:a=``,type:o=W.params.type,colorSteps:s=W.params.colorSteps,originalColors:c=W.params.originalColors,inverted:l=W.params.inverted,pxSize:u,size:d=u===void 0?W.params.size:u,fit:f=W.params.fit,scale:p=W.params.scale,rotation:m=W.params.rotation,originX:h=W.params.originX,originY:g=W.params.originY,offsetX:_=W.params.offsetX,offsetY:v=W.params.offsetY,worldWidth:y=W.params.worldWidth,worldHeight:b=W.params.worldHeight,...x}){let S={u_image:a,u_colorFront:z(n),u_colorBack:z(r),u_colorHighlight:z(i),u_type:xn[o],u_pxSize:d,u_colorSteps:s,u_originalColors:c,u_inverted:l,u_fit:sn[f],u_rotation:m,u_scale:p,u_offsetX:_,u_offsetY:v,u_originX:h,u_originY:g,u_worldWidth:y,u_worldHeight:b};return(0,L.jsx)(Hn,{...x,speed:e,frame:t,fragmentShader:En,uniforms:S})},Un),G={name:`Default`,params:{...R,scale:1,fit:`contain`,speed:0,frame:0,spread:.6,bias:1,angle:0,perspective:.1,count:35,dispersion:1,dispersionShift:0,dispersionColor:.6,focusCenter:.8,focusEdges:1,swirl:.35,noise:0,noiseFrequency:.25,noiseOffset:0,lensBulge:0,lensCircle:0,grainMixer:0,grainOverlay:0,imageX:0,imageY:0}};({...R}),{...R},{...R};var Yn=(0,I.memo)(function({speed:e=G.params.speed,frame:t=G.params.frame,image:n=``,spread:r=G.params.spread,bias:i=G.params.bias,angle:a=G.params.angle,perspective:o=G.params.perspective,count:s=G.params.count,dispersion:c=G.params.dispersion,dispersionShift:l=G.params.dispersionShift,dispersionColor:u=G.params.dispersionColor,focusCenter:d=G.params.focusCenter,focusEdges:f=G.params.focusEdges,swirl:p=G.params.swirl,noise:m=G.params.noise,noiseFrequency:h=G.params.noiseFrequency,noiseOffset:g=G.params.noiseOffset,lensBulge:_=G.params.lensBulge,lensCircle:v=G.params.lensCircle,grainMixer:y=G.params.grainMixer,grainOverlay:b=G.params.grainOverlay,imageX:x=G.params.imageX,imageY:S=G.params.imageY,fit:C=G.params.fit,scale:w=G.params.scale,rotation:T=G.params.rotation,originX:E=G.params.originX,originY:D=G.params.originY,offsetX:ee=G.params.offsetX,offsetY:O=G.params.offsetY,worldWidth:k=G.params.worldWidth,worldHeight:te=G.params.worldHeight,...A}){let j={u_image:n,u_spread:r,u_bias:i,u_angle:a,u_perspective:o,u_count:s,u_dispersion:c,u_dispersionShift:l,u_dispersionColor:u,u_focusCenter:d,u_focusEdges:f,u_swirl:p,u_noise:m,u_noiseFrequency:h,u_noiseOffset:g,u_lensBulge:_,u_lensCircle:v,u_grainMixer:y,u_grainOverlay:b,u_imageX:x,u_imageY:S,u_fit:sn[C],u_rotation:T,u_scale:w,u_offsetX:ee,u_offsetY:O,u_originX:E,u_originY:D,u_worldWidth:k,u_worldHeight:te};return(0,L.jsx)(Hn,{...A,speed:e,frame:t,fragmentShader:Dn,mipmaps:[`u_image`],uniforms:j})},Un),K={name:`Default`,params:{...R,fit:`cover`,speed:0,frame:0,colorBack:`#f2f1e8`,colorFront:`#2b2b2b`,size:.5,radius:1.25,contrast:.4,originalColors:!1,inverted:!1,grainMixer:.2,grainOverlay:.2,grainSize:.5,grid:`hex`,type:`gooey`}};({...R}),{...R},{...R};var Xn=(0,I.memo)(function({speed:e=K.params.speed,frame:t=K.params.frame,colorFront:n=K.params.colorFront,colorBack:r=K.params.colorBack,image:i=``,size:a=K.params.size,radius:o=K.params.radius,contrast:s=K.params.contrast,originalColors:c=K.params.originalColors,inverted:l=K.params.inverted,grainMixer:u=K.params.grainMixer,grainOverlay:d=K.params.grainOverlay,grainSize:f=K.params.grainSize,grid:p=K.params.grid,type:m=K.params.type,fit:h=K.params.fit,scale:g=K.params.scale,rotation:_=K.params.rotation,originX:v=K.params.originX,originY:y=K.params.originY,offsetX:b=K.params.offsetX,offsetY:x=K.params.offsetY,worldWidth:S=K.params.worldWidth,worldHeight:C=K.params.worldHeight,...w}){let T={u_image:i,u_colorFront:z(n),u_colorBack:z(r),u_size:a,u_radius:o,u_contrast:s,u_originalColors:c,u_inverted:l,u_grainMixer:u,u_grainOverlay:d,u_grainSize:f,u_grid:An[p],u_type:kn[m],u_fit:sn[h],u_rotation:_,u_scale:g,u_offsetX:b,u_offsetY:x,u_originX:v,u_originY:y,u_worldWidth:S,u_worldHeight:C};return(0,L.jsx)(Hn,{...w,speed:e,frame:t,fragmentShader:On,uniforms:T})},Un);y();var Zn=4,Qn=128,$n=(e,t)=>{let n=255,r=0;for(let i of e)n=Math.min(n,i[t]),r=Math.max(r,i[t]);return r-n},er=e=>{if(e.colors.length<2)return null;let t={r:$n(e.colors,`r`),g:$n(e.colors,`g`),b:$n(e.colors,`b`)},n=Object.keys(t).reduce((e,n)=>t[n]>t[e]?n:e,`r`),r=[...e.colors].sort((e,t)=>e[n]-t[n]),i=e.weight/2,a=0,o=1;for(let e=0;e<r.length-1&&(a+=r[e].weight,o=e+1,!(a>=i));e+=1);let s=r.slice(0,o),c=r.slice(o);return[{colors:s,weight:s.reduce((e,t)=>e+t.weight,0)},{colors:c,weight:c.reduce((e,t)=>e+t.weight,0)}]},tr=e=>{let t=e.colors.reduce((e,t)=>({r:e.r+t.r*t.weight,g:e.g+t.g*t.weight,b:e.b+t.b*t.weight}),{r:0,g:0,b:0});return{r:Math.round(t.r/e.weight),g:Math.round(t.g/e.weight),b:Math.round(t.b/e.weight),weight:e.weight}},nr=({r:e,g:t,b:n})=>`#${e.toString(16).padStart(2,`0`)}${t.toString(16).padStart(2,`0`)}${n.toString(16).padStart(2,`0`)}`,rr=(e,t=5)=>{if(t<=0)return[];let n=new Map;for(let t=0;t<e.length;t+=4){if(e[t+3]<Qn)continue;let r=e[t],i=e[t+1],a=e[t+2],o=r>>Zn<<8|i>>Zn<<4|a>>Zn,s=n.get(o);s?(s.r+=r,s.g+=i,s.b+=a,s.weight+=1):n.set(o,{r,g:i,b:a,weight:1})}let r=[...n.values()].map(e=>({r:Math.round(e.r/e.weight),g:Math.round(e.g/e.weight),b:Math.round(e.b/e.weight),weight:e.weight}));if(r.length===0)return[];let i=[{colors:r,weight:r.reduce((e,t)=>e+t.weight,0)}];for(;i.length<Math.min(t,r.length);){let e=-1,t=-1;for(let n=0;n<i.length;n+=1){let r=i[n];if(r.colors.length<2)continue;let a=Math.max($n(r.colors,`r`),$n(r.colors,`g`),$n(r.colors,`b`))*Math.sqrt(r.weight);a>t&&(t=a,e=n)}if(e<0)break;let n=er(i[e]);if(!n)break;i.splice(e,1,...n)}return i.map(tr).sort((e,t)=>t.weight-e.weight).map(nr)},ir=(e,{silent:t=!1}={})=>new Promise(n=>{let r=new Image;r.crossOrigin=`Anonymous`,r.onload=()=>{let e=document.createElement(`canvas`),i=e.getContext(`2d`);if(!i){n(null);return}e.width=50,e.height=50;try{i.drawImage(r,0,0,50,50),n(i.getImageData(0,0,50,50).data)}catch(e){t||console.warn(`Failed to read image pixels for color extraction`,e),n(null)}},r.onerror=e=>{t||console.warn(`Failed to load image for color extraction`,e),n(null)},r.src=e}),ar=(e,t)=>{let n=[];for(let t=0;t<e.length;t+=8){let r=e[t],i=e[t+1],a=e[t+2];if(e[t+3]<128)continue;let o=Math.max(r,i,a),s=Math.min(r,i,a),c=(o+s)/2;((o===s?0:(o-s)/(255-Math.abs(o+s-255)))>.2&&c>30&&c<220||n.length<100)&&n.push({r,g:i,b:a})}n.sort((e,t)=>{let n=(Math.max(e.r,e.g,e.b)-Math.min(e.r,e.g,e.b))/255;return(Math.max(t.r,t.g,t.b)-Math.min(t.r,t.g,t.b))/255-n});let r=[];for(let e of n){if(r.length>=t)break;(r.every(t=>Math.sqrt((e.r-t.r)**2+(e.g-t.g)**2+(e.b-t.b)**2)>20)||r.length===0)&&r.push(e)}return r.map(e=>`#${e.r.toString(16).padStart(2,`0`)}${e.g.toString(16).padStart(2,`0`)}${e.b.toString(16).padStart(2,`0`)}`)},or=async(e,t=5)=>{let n=await ir(e);return n?ar(n,t):[]},sr=async(e,t=5)=>{let n=await ir(e);return n?rr(n,t):[]},cr=(e,t,n)=>{let r=e.setUniformValues;if(n&&typeof r==`function`){r(t);return}e.setUniforms(t)},lr=Object.freeze({antialias:!1,depth:!1}),ur=e=>(t=>{if(e.current=t,t)return()=>{e.current=null;let n=t.paperShaderMount?.canvasElement;if(!n)return;let r=n.getContext(`webgl2`);queueMicrotask(()=>{!r||n.isConnected||r.isContextLost()||r.getExtension(`WEBGL_lose_context`)?.loseContext()})}});ge();var dr=.35,fr=(e,t)=>e?.rhythmic===!1?0:!e||e.impact===void 0?t:(dr+.65*e.impact)*t,pr=(e=[],t=1)=>({events:e,trackScale:t,lastBeat:null,lastDownbeat:null,cursor:0,lastTime:null,beatImpact:0,downbeatImpact:0,rotationSign:1,firedBeats:0,firedDownbeats:0,lastFiredT:null}),mr=(e,t)=>{let n=0,r=e.length;for(;n<r;){let i=n+r>>1;e[i].t<=t?n=i+1:r=i}return n},hr=(e,t,n)=>{let r=new Set(t),i=e.map((e,t)=>t).filter(e=>!n||n.pulse[e]!==0),a=i.length<e.length?i.map(t=>e[t]):e,o=n&&i.length<e.length?{...n,impact:i.map(e=>n.impact[e]),low:i.map(e=>n.low[e]),mid:i.map(e=>n.mid[e]),high:i.map(e=>n.high[e]),rhythmic:i.map(e=>n.rhythmic[e]),pulse:i.map(()=>1)}:n,s=a.map((e,t)=>{let n={t:e,kind:r.has(e)?`downbeat`:`beat`};return o&&(n.impact=o.impact[t],n.tone={low:o.low[t],mid:o.mid[t],high:o.high[t]},n.rhythmic=o.rhythmic[t]!==0),n}),c=new Set(e);if(t.forEach(e=>{c.has(e)||s.push({t:e,kind:`downbeat`})}),s.sort((e,t)=>e.t-t.t),o){let e=null;s.forEach(t=>{e=t.kind===`downbeat`?0:e===null?null:e+1,t.barPos=e})}return s},gr=(e,t,n)=>{let r=Math.max(0,n)*1e3;if(e.beatImpact*=Math.exp(-r/160*2.3),e.downbeatImpact*=Math.exp(-r/200*2.3),e.beatImpact<1e-4&&(e.beatImpact=0),e.downbeatImpact<1e-4&&(e.downbeatImpact=0),t===null||!Number.isFinite(t))return e.lastTime=null,e;let i=e.lastTime;e.lastTime=t;let a=i===null?NaN:t-i;if(i===null||a<0||a>.3)return e.cursor=mr(e.events,t),e;for(;e.cursor<e.events.length&&e.events[e.cursor].t<=t;){let n=e.events[e.cursor];e.cursor+=1;let r=Math.max(0,t-n.t)*1e3,i=n.kind===`downbeat`,a=fr(n,e.trackScale);e.beatImpact=Math.max(e.beatImpact,a*Math.exp(-r/160*2.3)),e.rotationSign=-e.rotationSign,e.lastFiredT=n.t,i?(e.downbeatImpact=Math.max(e.downbeatImpact,a*Math.exp(-r/200*2.3)),e.firedDownbeats+=1,e.lastDownbeat=n):e.lastBeat=n,e.firedBeats+=1}return e},_r=1500,q=(()=>{try{return typeof localStorage<`u`&&localStorage.getItem(`folia.dev.beatFxDebug`)===`1`}catch{return!1}})()?{beats:0,downbeats:0,lastT:null,heardT:null,source:`none`,note:null,trackKey:null,eventCount:0,latencyMs:0,beatImpact:0,downbeatImpact:0}:null;q&&typeof window<`u`&&(window.__foliaBeatFx=q);var J=pr(),vr=null,yr=null,br=0,xr=!1,Sr=null,Cr={beat:1,downbeat:1},wr=.5,Tr=wr,Er=e=>{if(e.length<2)return wr;let t=[];for(let n=1;n<e.length;n+=1)t.push(e[n].t-e[n-1].t);t.sort((e,t)=>e-t);let n=t[t.length>>1];return n>0?n:wr},Dr={beats:0,downbeats:0},Or=(e,t)=>{Cr.beat=e,Cr.downbeat=t},kr=()=>Cr,Ar={},jr=e=>{Ar=e},Mr=e=>Ar[e]??0,Nr=()=>Dr,Pr=e=>{let t=Ir();br=e&&t?Math.max(br,performance.now()+_r):0,vr=e,J.events=[],J.cursor=0,J.lastTime=null,J.lastBeat=null,J.lastDownbeat=null,q&&(q.trackKey=e,q.source=e?`loading`:`none`,q.note=null,q.eventCount=0)},Fr=(e,t,n,r,i=1)=>{e===vr&&(J.events=t,J.trackScale=i,Tr=Er(t),br=0,J.lastTime=null,q&&(q.source=n,q.note=r??null,q.eventCount=t.length))},Ir=()=>vr!==null&&(J.events.length>0||br>0&&performance.now()<br),Lr=()=>xr,Rr=()=>({key:vr,time:Sr}),zr=()=>{Pr(null),J.beatImpact=0,J.downbeatImpact=0,he.set(0),_e.set(0),yr=null,xr=!1},Br=()=>J.lastBeat,Vr=()=>J.lastDownbeat,Hr=()=>J.events,Ur=()=>Tr,Wr=()=>J.trackScale,Gr=()=>J.rotationSign,Kr=(e,t)=>{let n=performance.now(),r=yr===null?0:Math.min(.1,(n-yr)/1e3);yr=n;let i=null;if(e&&!e.paused&&!e.ended){let n=t,r=(Number(n?.outputLatency)||0)+(Number(n?.baseLatency)||0);i=e.currentTime-r,q&&(q.latencyMs=r*1e3)}xr=i!==null,Sr=i,gr(J,i,r),Dr.beats=J.firedBeats,Dr.downbeats=J.firedDownbeats,he.set(J.beatImpact*Cr.beat),_e.set(J.downbeatImpact*Cr.downbeat),q&&(q.beats=J.firedBeats,q.downbeats=J.firedDownbeats,q.lastT=J.lastFiredT,q.heardT=i,q.beatImpact=J.beatImpact,q.downbeatImpact=J.downbeatImpact)};ge();var qr=921600,Jr=.12,Yr=300,Xr=e=>Math.min(1,Math.max(0,e/255)),Zr=e=>Math.min(2,Math.max(0,e)),Qr=e=>Math.min(1,Math.max(0,e)),$r=(e,t,n)=>e+(t-e)*n,ei=(e,t,n,r,i)=>(Xr(e)*.22+Xr(t)*.18+Xr(n)*.22+Xr(r)*.28+Xr(i)*.1)**.55,ti=(e,t,n)=>Math.max(n*.84,Qr((e-t)*7)),ni=(e,t)=>Qr(e*.42+t*.85),ri=(e,t)=>Math.max(e,t),ii=(e,t,n)=>n?ni(e,t):Qr(e),ai=(e,t,n,r)=>Zr(r?e*Jr:$r(e,t,n)),oi=(e,t,n)=>{let r=e[0]??t.secondaryColor;if(n===`cover-only`){let t=e[1]??r,n=e[2]??t;return{ditheringBack:n,ditheringFront:r,mesh:[r,t,n,e[3]??r,e[4]??t,e[5]??n]}}let i=e[1]??t.primaryColor,a=e[2]??r,o=e[3]??i;return{ditheringBack:t.backgroundColor,ditheringFront:r,mesh:[r,i,a,o,t.backgroundColor,t.accentColor]}},si=I.memo(({theme:e,coverUrl:t,audioPower:n,audioBands:r,staticMode:i,paused:a,tuning:o,blendMs:s=0,blendProgress:c})=>{let l=(0,I.useRef)(null),u=(0,I.useRef)(null),d=(0,I.useMemo)(()=>ur(l),[]),f=(0,I.useMemo)(()=>ur(u),[]),p=(0,I.useRef)(null),m=(0,I.useRef)(null),h=(0,I.useRef)(a),g=(0,I.useRef)(+!a),[_,v]=(0,I.useState)([]),y=o??b,x=y.displayMode!==`mesh`,S=y.displayMode!==`dithering`;h.current=a;let C=Ge();(0,I.useEffect)(()=>{let e=!0;return t?(sr(t,6).then(t=>{e&&(v(t),C())}),()=>{e=!1}):(v([]),C(),()=>{e=!1})},[t,C]);let w=(0,I.useMemo)(()=>oi(_,e,y.colorSource),[_,e,y.colorSource]),T=$e([e.backgroundColor,w.ditheringBack,w.ditheringFront,...w.mesh],s,c),[D,ee,O]=T,k=(0,I.useMemo)(()=>({ditheringBack:ee,ditheringFront:O,mesh:T.slice(3)}),[T,ee,O]);return(0,I.useEffect)(()=>{let e=l.current?.paperShaderMount,t=u.current?.paperShaderMount;if(i){e?.setSpeed(0),t?.setSpeed(0);return}let a=0,o=new WeakMap,s=(e,t,n)=>{let r=o.get(e);r||(r={},o.set(e,r)),r[t]!==n&&(r[t]=n,e.style[t]=n)},c=0,d=0,f=0,_=0,v=0,b=0,x=null,C=(e,t)=>$r(ai(e,t,_,!0),ai(e,t,_,!1),g.current),w=e=>{a=requestAnimationFrame(w);let t=h.current,i=x===null?0:1-Math.exp((x-e)/Yr);x=e,g.current=$r(g.current,+!t,i);let o=t?0:Xr(n.get()),T=t?0:Xr(r.bass.get()),D=t?0:ei(r.bass.get(),r.lowMid.get(),r.mid.get(),r.vocal.get(),r.treble.get()),ee=t?0:Xr(Math.max(r.mid.get(),r.vocal.get()));c=$r(c,o,.12),d=$r(d,T,.16),f=$r(f,ee,.13),b=y.enhancedBeatResponse?ti(D,v,b):0,v=D;let O=!t&&Ir()&&Mr(E.latentPulse)>0?ni(D,ri(he.get(),_e.get())):ii(D,b,y.enhancedBeatResponse);_=$r(_,O,O>_?.42:.14);let k=l.current?.paperShaderMount,te=u.current?.paperShaderMount;if(k){let e=C(y.ditheringSpeed,y.ditheringAudioSpeed);k.setSpeed(e),cr(k,{u_pxSize:Math.max(.5,y.ditheringSize-d*y.ditheringSize*.34)},e!==0)}if(te){let e=C(y.meshSpeed,y.meshAudioSpeed);te.setSpeed(e),cr(te,{u_distortion:y.meshDistortion+c*.62,u_swirl:y.meshSwirl+f*.38},e!==0)}p.current&&(s(p.current,`opacity`,S?`${Math.min(1,y.ditheringOpacity+d*.25)}`:`1`),s(p.current,`transform`,`scale(${1.015+d*.025})`)),m.current&&(s(m.current,`filter`,`saturate(${1.04+f*.34}) brightness(${.94+c*.16})`),s(m.current,`transform`,`scale(${1.025+c*.018})`))};return a=requestAnimationFrame(w),()=>cancelAnimationFrame(a)},[r,n,S,i,y]),(0,L.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,style:{backgroundColor:D,pointerEvents:`none`},children:[S&&(0,L.jsx)(`div`,{ref:m,className:`absolute inset-0`,style:{transform:`scale(1.025)`,transformOrigin:`center`},children:(0,L.jsx)(Wn,{ref:f,width:`100%`,height:`100%`,colors:k.mesh,distortion:y.meshDistortion,swirl:y.meshSwirl,grainMixer:0,grainOverlay:.01,speed:i?0:y.meshSpeed,minPixelRatio:1,maxPixelCount:qr,webGlContextAttributes:lr,style:{width:`100%`,height:`100%`}})}),x&&(0,L.jsx)(`div`,{ref:p,className:`absolute inset-0`,style:{mixBlendMode:S?`soft-light`:`normal`,opacity:S?y.ditheringOpacity:1,transform:`scale(1.015)`,transformOrigin:`center`},children:(0,L.jsx)(Gn,{ref:d,width:`100%`,height:`100%`,colorBack:k.ditheringBack,colorFront:k.ditheringFront,shape:`warp`,type:`4x4`,size:y.ditheringSize,speed:i?0:y.ditheringSpeed,minPixelRatio:1,maxPixelCount:qr,webGlContextAttributes:lr,style:{width:`100%`,height:`100%`}})}),y.overlayEnabled&&y.overlayOpacity>0&&(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:D,opacity:y.overlayOpacity}})]})}),ci={id:`bg-latent`,titleKey:`options.latentBackgroundSettings`},li={id:`bg-latent-dithering`,titleKey:`options.latentDitheringGroup`},ui={id:`bg-latent-mesh`,titleKey:`options.latentMeshGroup`},di=e=>e.toFixed(1),fi=e=>e.toFixed(2),pi=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(M,{def:ci,children:[(0,L.jsx)(j,{label:e(`options.latentDisplayMode`),children:(0,L.jsx)(re,{value:t.displayMode,options:[{value:`dithering`,label:e(`options.latentDisplayDithering`)},{value:`mesh`,label:e(`options.latentDisplayMesh`)},{value:`both`,label:e(`options.latentDisplayBoth`)}],onChange:e=>n?.({displayMode:e})})}),(0,L.jsx)(j,{label:e(`options.latentColorSource`),children:(0,L.jsx)(re,{value:t.colorSource,options:[{value:`cover-theme`,label:e(`options.latentColorSourceCoverTheme`)},{value:`cover-only`,label:e(`options.latentColorSourceCoverOnly`)}],onChange:e=>n?.({colorSource:e})})}),(0,L.jsx)(F,{label:e(`options.latentDynamicOnlyInPlayer`),note:e(`options.latentDynamicOnlyInPlayerDesc`),checked:t.dynamicOnlyInPlayer,onChange:e=>n?.({dynamicOnlyInPlayer:e})}),(0,L.jsx)(F,{label:e(`options.latentEnhancedBeatResponse`),note:e(`options.latentEnhancedBeatResponseDesc`),checked:t.enhancedBeatResponse,onChange:e=>n?.({enhancedBeatResponse:e})}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundOverlay`),note:e(`options.nomandBackgroundOverlayDesc`),checked:t.overlayEnabled,onChange:e=>n?.({overlayEnabled:e})}),(0,L.jsx)(A,{when:t.overlayEnabled,children:(0,L.jsx)(N,{...a,sub:!0,label:e(`options.nomandBackgroundOverlayOpacity`),value:t.overlayOpacity,min:0,max:1,step:.05,format:P,onChange:e=>n?.({overlayOpacity:e})})})]}),(0,L.jsxs)(M,{def:li,children:[(0,L.jsx)(N,{...a,label:e(`options.latentBaseSpeed`),value:t.ditheringSpeed,min:0,max:2,step:.1,format:di,onChange:e=>n?.({ditheringSpeed:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentAudioSpeed`),value:t.ditheringAudioSpeed,min:0,max:2,step:.1,format:di,onChange:e=>n?.({ditheringAudioSpeed:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentDitheringSize`),value:t.ditheringSize,min:.5,max:8,step:.25,format:fi,onChange:e=>n?.({ditheringSize:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentDitheringOpacity`),value:t.ditheringOpacity,min:0,max:1,step:.05,format:P,onChange:e=>n?.({ditheringOpacity:e})})]}),(0,L.jsxs)(M,{def:ui,children:[(0,L.jsx)(N,{...a,label:e(`options.latentBaseSpeed`),value:t.meshSpeed,min:0,max:2,step:.1,format:di,onChange:e=>n?.({meshSpeed:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentAudioSpeed`),value:t.meshAudioSpeed,min:0,max:2,step:.1,format:di,onChange:e=>n?.({meshAudioSpeed:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentMeshDistortion`),value:t.meshDistortion,min:0,max:2,step:.05,format:fi,onChange:e=>n?.({meshDistortion:e})}),(0,L.jsx)(N,{...a,label:e(`options.latentMeshSwirl`),value:t.meshSwirl,min:0,max:1,step:.05,format:fi,onChange:e=>n?.({meshSwirl:e})})]})]})},mi=t({default:()=>yi});y();var hi=[`dithering`,`mesh`,`both`],gi={dithering:`options.latentDisplayDithering`,mesh:`options.latentDisplayMesh`,both:`options.latentDisplayBoth`},_i=[`cover-theme`,`cover-only`],vi={"cover-theme":`options.latentColorSourceCoverTheme`,"cover-only":`options.latentColorSourceCoverOnly`},yi=ve({mode:`latent`,order:35,labelKey:`options.visualizerBackgroundModeLatent`,labelFallback:`Latent`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`path`,{d:`M4.5 7.5h.01M9 7.5h.01M13.5 7.5h.01M18 7.5h.01`,strokeWidth:`2.2`,opacity:`0.55`}),(0,L.jsx)(`path`,{d:`M3 15c3-3.5 6-3.5 9 0s6 3.5 9 0`})]}),command:{title:`Background: Latent`,description:`Switch background to cover-colored audio-reactive shaders`,keywords:[`latent`,`latent background`,`shader background`,`隐现`,`隐现背景`,`音频响应背景`]},beatEffects:[{id:E.latentPulse,nameKey:`options.beatEffect_latentPulse`,descKey:`options.beatEffect_latentPulseDesc`,source:`beats`,retired:!0}],render:({config:e,theme:t,coverUrl:n,audioPower:r,audioBands:i,staticMode:a,paused:o,blendMs:s,blendProgress:c})=>(0,L.jsx)(si,{theme:t,coverUrl:n,audioPower:r,audioBands:i,staticMode:a,paused:o,tuning:e?.latent?.tuning,blendMs:s,blendProgress:c}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,L.jsx)(pi,{...n,tuning:e?.latent?.tuning??b,onTuningChange:t?.latent?.onTuningChange}),renderQuickControls:({config:e,actions:t,t:n})=>{let r=e?.latent?.tuning??b,i=n(gi[r.displayMode]),a=n(vi[r.colorSource]);return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(oe,{label:i,title:`${n(`options.latentDisplayMode`)}: ${i}`,onClick:()=>t?.latent?.onTuningChange?.({displayMode:ie(hi,r.displayMode)})}),(0,L.jsx)(oe,{label:a,title:`${n(`options.latentColorSource`)}: ${a}`,onClick:()=>t?.latent?.onTuningChange?.({colorSource:ie(_i,r.colorSource)})}),(0,L.jsx)(ce,{active:r.overlayEnabled,label:n(`options.nomandBackgroundOverlay`),onToggle:()=>t?.latent?.onTuningChange?.({overlayEnabled:!r.overlayEnabled}),children:(0,L.jsx)(d,{size:14})})]})},resetSettings:e=>e?.latent?.onResetTuning?.()});function bi(){return(bi=Object.assign||function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(this,arguments)}function xi(e,t){if(e==null)return{};var n,r,i={},a=Object.keys(e);for(r=0;r<a.length;r++)t.indexOf(n=a[r])>=0||(i[n]=e[n]);return i}function Si(e){var t=(0,I.useRef)(e),n=(0,I.useRef)(function(e){t.current&&t.current(e)});return t.current=e,n.current}var Ci=function(e,t,n){return t===void 0&&(t=0),n===void 0&&(n=1),e>n?n:e<t?t:e},wi=function(e){return`touches`in e},Ti=function(e){return e&&e.ownerDocument.defaultView||self},Ei=function(e,t,n){var r=e.getBoundingClientRect(),i=wi(t)?function(e,t){for(var n=0;n<e.length;n++)if(e[n].identifier===t)return e[n];return e[0]}(t.touches,n):t;return{left:Ci((i.pageX-(r.left+Ti(e).pageXOffset))/r.width),top:Ci((i.pageY-(r.top+Ti(e).pageYOffset))/r.height)}},Di=function(e){!wi(e)&&e.preventDefault()},Oi=I.memo(function(e){var t=e.onMove,n=e.onKey,r=e.onEnd,i=xi(e,[`onMove`,`onKey`,`onEnd`]),a=(0,I.useRef)(null),o=Si(t),s=Si(n),c=Si(r),l=(0,I.useRef)(null),u=(0,I.useRef)(!1),d=(0,I.useMemo)(function(){var e=function(e){Di(e),(wi(e)?e.touches.length>0:e.buttons>0)&&a.current?o(Ei(a.current,e,l.current)):(n(!1),c())},t=function(){n(!1),c()};function n(n){var r=u.current,i=Ti(a.current),o=n?i.addEventListener:i.removeEventListener;o(r?`touchmove`:`mousemove`,e),o(r?`touchend`:`mouseup`,t)}return[function(e){var t=e.nativeEvent,r=a.current;if(r&&(Di(t),!function(e,t){return t&&!wi(e)}(t,u.current)&&r)){if(wi(t)){u.current=!0;var i=t.changedTouches||[];i.length&&(l.current=i[0].identifier)}r.focus(),o(Ei(r,t,l.current)),n(!0)}},function(e){var t=e.which||e.keyCode;t<37||t>40||(e.preventDefault(),s({left:t===39?.05:t===37?-.05:0,top:t===40?.05:t===38?-.05:0}))},function(e){var t=e.which||e.keyCode;t>=37&&t<=40&&c()},n]},[s,o,c]),f=d[0],p=d[1],m=d[2],h=d[3];return(0,I.useEffect)(function(){return h},[h]),I.createElement(`div`,bi({},i,{onTouchStart:f,onMouseDown:f,className:`react-colorful__interactive`,ref:a,onKeyDown:p,onKeyUp:m,tabIndex:0,role:`slider`}))}),ki=function(e){return e.filter(Boolean).join(` `)},Ai=function(e){var t=e.color,n=e.left,r=e.top,i=r===void 0?.5:r,a=ki([`react-colorful__pointer`,e.className]);return I.createElement(`div`,{className:a,style:{top:100*i+`%`,left:100*n+`%`}},I.createElement(`div`,{className:`react-colorful__pointer-fill`,style:{backgroundColor:t}}))},Y=function(e,t,n){return t===void 0&&(t=0),n===void 0&&(n=10**t),Math.round(n*e)/n},ji=function(e){return zi(Mi(e))},Mi=function(e){return e[0]===`#`&&(e=e.substring(1)),e.length<6?{r:parseInt(e[0]+e[0],16),g:parseInt(e[1]+e[1],16),b:parseInt(e[2]+e[2],16),a:e.length===4?Y(parseInt(e[3]+e[3],16)/255,2):1}:{r:parseInt(e.substring(0,2),16),g:parseInt(e.substring(2,4),16),b:parseInt(e.substring(4,6),16),a:e.length===8?Y(parseInt(e.substring(6,8),16)/255,2):1}},Ni=function(e){return Ri(Ii(e))},Pi=function(e){var t=e.s,n=e.v,r=e.a,i=(200-t)*n/100;return{h:Y(e.h),s:Y(i>0&&i<200?t*n/100/(i<=100?i:200-i)*100:0),l:Y(i/2),a:Y(r,2)}},Fi=function(e){var t=Pi(e);return`hsl(`+t.h+`, `+t.s+`%, `+t.l+`%)`},Ii=function(e){var t=e.h,n=e.s,r=e.v,i=e.a;t=t/360*6,n/=100,r/=100;var a=Math.floor(t),o=r*(1-n),s=r*(1-(t-a)*n),c=r*(1-(1-t+a)*n),l=a%6;return{r:Y(255*[r,s,o,o,c,r][l]),g:Y(255*[c,r,r,s,o,o][l]),b:Y(255*[o,o,c,r,r,s][l]),a:Y(i,2)}},Li=function(e){var t=e.toString(16);return t.length<2?`0`+t:t},Ri=function(e){var t=e.r,n=e.g,r=e.b,i=e.a,a=i<1?Li(Y(255*i)):``;return`#`+Li(t)+Li(n)+Li(r)+a},zi=function(e){var t=e.r,n=e.g,r=e.b,i=e.a,a=Math.max(t,n,r),o=a-Math.min(t,n,r),s=o?a===t?(n-r)/o:a===n?2+(r-t)/o:4+(t-n)/o:0;return{h:60*(s<0?s+6:s),s:a?o/a*100:0,v:a/255*100,a:i}},Bi=I.memo(function(e){var t=e.hue,n=e.onChange,r=e.onChangeEnd,i=ki([`react-colorful__hue`,e.className]);return I.createElement(`div`,{className:i},I.createElement(Oi,{onMove:function(e){n({h:360*e.left})},onKey:function(e){n({h:Ci(t+360*e.left,0,360)})},onEnd:r,"aria-label":`Hue`,"aria-valuenow":Y(t),"aria-valuemax":`360`,"aria-valuemin":`0`},I.createElement(Ai,{className:`react-colorful__hue-pointer`,left:t/360,color:Fi({h:t,s:100,v:100,a:1})})))}),Vi=I.memo(function(e){var t=e.hsva,n=e.onChange,r=e.onChangeEnd,i={backgroundColor:Fi({h:t.h,s:100,v:100,a:1})};return I.createElement(`div`,{className:`react-colorful__saturation`,style:i},I.createElement(Oi,{onMove:function(e){n({s:100*e.left,v:100-100*e.top})},onKey:function(e){n({s:Ci(t.s+100*e.left,0,100),v:Ci(t.v-100*e.top,0,100)})},onEnd:r,"aria-label":`Color`,"aria-valuetext":`Saturation `+Y(t.s)+`%, Brightness `+Y(t.v)+`%`},I.createElement(Ai,{className:`react-colorful__saturation-pointer`,top:1-t.v/100,left:t.s/100,color:Fi(t)})))}),Hi=function(e,t){if(e===t)return!0;for(var n in e)if(e[n]!==t[n])return!1;return!0},Ui=function(e,t){return e.toLowerCase()===t.toLowerCase()||Hi(Mi(e),Mi(t))};function Wi(e,t,n,r){var i=Si(n),a=Si(r),o=(0,I.useState)(function(){return e.toHsva(t)}),s=o[0],c=o[1],l=(0,I.useRef)({color:t,hsva:s}),u=(0,I.useRef)(!1);return(0,I.useEffect)(function(){if(!e.equal(t,l.current.color)){var n=e.toHsva(t);l.current={hsva:n,color:t},c(n),u.current=!1}},[t,e]),(0,I.useEffect)(function(){var t;Hi(s,l.current.hsva)||e.equal(t=e.fromHsva(s),l.current.color)||(l.current={hsva:s,color:t},i(t),u.current=!0)},[s,e,i]),[s,(0,I.useCallback)(function(e){c(function(t){return Object.assign({},t,e)})},[]),(0,I.useCallback)(function(){u.current&&(u.current=!1,a(l.current.color))},[a])]}var Gi=typeof window<`u`?I.useLayoutEffect:I.useEffect,Ki=function(){return typeof __webpack_nonce__<`u`?__webpack_nonce__:void 0},qi=new WeakMap,Ji=function(e){Gi(function(){var t=e.current;if(typeof document<`u`&&t){var n=t.getRootNode?t.getRootNode():t.ownerDocument,r=n&&(`head`in n||`host`in n)?n:t.ownerDocument;if(!qi.has(r)){var i=`head`in r?r.head:r,a=(i.ownerDocument||document).createElement(`style`);a.innerHTML=`.react-colorful{position:relative;display:flex;flex-direction:column;width:200px;height:200px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:default}.react-colorful__saturation{position:relative;flex-grow:1;border-color:transparent;border-bottom:12px solid #000;border-radius:8px 8px 0 0;background-image:linear-gradient(0deg,#000,transparent),linear-gradient(90deg,#fff,hsla(0,0%,100%,0))}.react-colorful__alpha-gradient,.react-colorful__pointer-fill{content:"";position:absolute;left:0;top:0;right:0;bottom:0;pointer-events:none;border-radius:inherit}.react-colorful__alpha-gradient,.react-colorful__saturation{box-shadow:inset 0 0 0 1px rgba(0,0,0,.05)}.react-colorful__alpha,.react-colorful__hue{position:relative;height:24px}.react-colorful__hue{background:linear-gradient(90deg,red 0,#ff0 17%,#0f0 33%,#0ff 50%,#00f 67%,#f0f 83%,red)}.react-colorful__last-control{border-radius:0 0 8px 8px}.react-colorful__interactive{position:absolute;left:0;top:0;right:0;bottom:0;border-radius:inherit;outline:none;touch-action:none}.react-colorful__pointer{position:absolute;z-index:1;box-sizing:border-box;width:28px;height:28px;transform:translate(-50%,-50%);background-color:#fff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 4px rgba(0,0,0,.2)}.react-colorful__interactive:focus .react-colorful__pointer{transform:translate(-50%,-50%) scale(1.1)}.react-colorful__alpha,.react-colorful__alpha-pointer{background-color:#fff;background-image:url('data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill-opacity=".05"><path d="M8 0h8v8H8zM0 8h8v8H0z"/></svg>')}.react-colorful__saturation-pointer{z-index:3}.react-colorful__hue-pointer{z-index:2}`;var o=Ki();o&&a.setAttribute(`nonce`,o),qi.set(r,a),i.appendChild(a)}}},[])},Yi=function(e){var t=e.className,n=e.colorModel,r=e.color,i=r===void 0?n.defaultColor:r,a=e.onChange,o=e.onChangeEnd,s=xi(e,[`className`,`colorModel`,`color`,`onChange`,`onChangeEnd`]),c=(0,I.useRef)(null);Ji(c);var l=Wi(n,i,a,o),u=l[0],d=l[1],f=l[2],p=ki([`react-colorful`,t]);return I.createElement(`div`,bi({},s,{ref:c,className:p}),I.createElement(Vi,{hsva:u,onChange:d,onChangeEnd:f}),I.createElement(Bi,{hue:u.h,onChange:d,onChangeEnd:f,className:`react-colorful__last-control`}))},Xi={defaultColor:`000`,toHsva:ji,fromHsva:function(e){return Ni({h:e.h,s:e.s,v:e.v,a:1})},equal:Ui},Zi=function(e){return I.createElement(Yi,bi({},e,{colorModel:Xi}))};y();var Qi={id:`bg-monet-source`,titleKey:`options.monetGroupBackgroundSource`},$i={id:`bg-monet-layout`,titleKey:`options.monetGroupLayoutPosition`},ea={id:`bg-monet-filters`,titleKey:`options.monetGroupFiltersPostProcessing`},ta={id:`bg-monet-tint`,titleKey:`options.monetGroupColorTintWash`},na=(e,t,n,r)=>Number.isFinite(e)?Math.min(n,Math.max(t,e)):r,ra=e=>{let t=e.trim().replace(/^#/,``);return/^[0-9a-fA-F]{6}$/.test(t)?`#${t.toLowerCase()}`:null},ia=e=>(0,L.jsx)(`span`,{className:`absolute inset-0`,style:{backgroundImage:e===`full-overlay`?`linear-gradient(var(--st-t3), var(--st-t3))`:`linear-gradient(90deg, var(--st-t3) 30%, transparent 62%)`}}),aa=({t:e,tuning:t=k,onTuningChange:n,monetBackgroundImage:r,onUploadMonetBackgroundImage:a,onClearMonetBackgroundImage:o,isLoadingMonetBackgroundImage:s=!1,onSliderPointerDown:c,onSliderCommit:u})=>{let d=(0,I.useRef)(null),[f,p]=(0,I.useState)(null),m={backgroundSource:t.backgroundSource??k.backgroundSource,backgroundLayout:t.backgroundLayout??k.backgroundLayout,backgroundBlurPx:na(t.backgroundBlurPx??k.backgroundBlurPx,0,60,k.backgroundBlurPx),backgroundOverlayOpacity:na(t.backgroundOverlayOpacity??k.backgroundOverlayOpacity,0,1,k.backgroundOverlayOpacity),backgroundGrayscale:na(t.backgroundGrayscale??k.backgroundGrayscale,0,1,k.backgroundGrayscale),backgroundSaturation:na(t.backgroundSaturation??k.backgroundSaturation,0,2,k.backgroundSaturation),backgroundWash:na(t.backgroundWash??k.backgroundWash,0,1,k.backgroundWash),backgroundHalfPaneOffsetX:na(t.backgroundHalfPaneOffsetX??k.backgroundHalfPaneOffsetX,-40,40,k.backgroundHalfPaneOffsetX),backgroundWashColorMode:t.backgroundWashColorMode??k.backgroundWashColorMode,backgroundWashCustomColor:ra(t.backgroundWashCustomColor)??k.backgroundWashCustomColor,backgroundDriftEnabled:t.backgroundDriftEnabled??k.backgroundDriftEnabled,backgroundDriftStrength:na(t.backgroundDriftStrength??k.backgroundDriftStrength,0,1,k.backgroundDriftStrength),backgroundStreaksEnabled:t.backgroundStreaksEnabled??k.backgroundStreaksEnabled},h={onDragStart:c,onDragEnd:u},g=async t=>{let r=Array.from(t.target.files??[]);if(t.target.value=``,p(null),!r.length||!a)return;let i=await a(r);i.ok?(n?.({backgroundSource:`uploaded-global`}),p(r[0].name)):p(i.error||e(`options.monetUploadBackground`))};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(M,{def:Qi,children:[(0,L.jsx)(j,{label:e(`options.monetBackgroundSource`),children:(0,L.jsx)(re,{value:m.backgroundSource,options:[{value:`cover-derived`,label:e(`options.monetBackgroundSourceCover`)},{value:`uploaded-global`,label:e(`options.monetBackgroundSourceUploaded`),disabled:!r&&!s}],onChange:e=>n?.({backgroundSource:e})})}),(0,L.jsxs)(j,{label:e(`options.monetUploadBackground`),hint:f||r?.name||`-`,children:[(0,L.jsx)(se,{icon:l,onClick:()=>d.current?.click(),disabled:s||!a,children:e(`options.monetUploadBackground`)}),(0,L.jsx)(se,{icon:i,onClick:()=>void o?.(),disabled:!r||!o,children:e(`options.monetClearBackground`)}),(0,L.jsx)(`input`,{ref:d,type:`file`,accept:`.png,.jpg,.jpeg,.gif,.webp,.svg,image/*`,className:`hidden`,onChange:e=>void g(e)})]})]}),(0,L.jsxs)(M,{def:$i,children:[(0,L.jsx)(j,{label:e(`options.monetBackgroundLayout`),below:(0,L.jsx)(ae,{className:`-mx-4`,columns:4,label:e(`options.monetBackgroundLayout`),value:m.backgroundLayout,options:[{value:`half-pane-gradient`,label:e(`options.monetLayoutHalfPane`)},{value:`full-overlay`,label:e(`options.monetLayoutFullOverlay`)}],picture:ia,onChange:e=>n?.({backgroundLayout:e})})}),(0,L.jsx)(A,{when:m.backgroundLayout===`half-pane-gradient`,children:(0,L.jsx)(N,{...h,sub:!0,label:e(`options.monetHalfPaneOffsetX`),value:m.backgroundHalfPaneOffsetX,min:-40,max:40,step:2,format:e=>`${Math.round(e)}%`,onChange:e=>n?.({backgroundHalfPaneOffsetX:e})})}),(0,L.jsx)(F,{label:e(`options.monetBackgroundDriftEnabled`),note:e(`options.monetBackgroundDriftEnabledDesc`),checked:m.backgroundDriftEnabled,onChange:e=>n?.({backgroundDriftEnabled:e})}),(0,L.jsx)(A,{when:m.backgroundDriftEnabled,children:(0,L.jsx)(N,{...h,sub:!0,label:e(`options.monetBackgroundDriftStrength`),value:m.backgroundDriftStrength,min:0,max:1,step:.05,format:P,onChange:e=>n?.({backgroundDriftStrength:e})})})]}),(0,L.jsxs)(M,{def:ea,children:[(0,L.jsx)(N,{...h,label:e(`options.monetBackgroundBlur`),value:m.backgroundBlurPx,min:0,max:60,step:2,format:e=>`${Math.round(e)}px`,onChange:e=>n?.({backgroundBlurPx:e})}),(0,L.jsx)(N,{...h,label:e(`options.monetBackgroundSaturation`),value:m.backgroundSaturation,min:0,max:2,step:.05,format:P,onChange:e=>n?.({backgroundSaturation:e})}),(0,L.jsx)(N,{...h,label:e(`options.monetBackgroundGrayscale`),value:m.backgroundGrayscale,min:0,max:1,step:.02,format:P,onChange:e=>n?.({backgroundGrayscale:e})})]}),(0,L.jsxs)(M,{def:ta,children:[(0,L.jsx)(N,{...h,label:e(`options.monetBackgroundOverlayOpacity`),value:m.backgroundOverlayOpacity,min:0,max:1,step:.02,format:P,onChange:e=>n?.({backgroundOverlayOpacity:e})}),(0,L.jsx)(N,{...h,label:e(`options.monetBackgroundWash`),value:m.backgroundWash,min:0,max:1,step:.02,format:P,onChange:e=>n?.({backgroundWash:e})}),(0,L.jsx)(F,{label:e(`options.monetBackgroundStreaksEnabled`),note:e(`options.monetBackgroundStreaksEnabledDesc`),checked:m.backgroundStreaksEnabled,onChange:e=>n?.({backgroundStreaksEnabled:e})}),(0,L.jsx)(j,{label:e(`options.monetBackgroundWashColorMode`),children:(0,L.jsx)(re,{value:m.backgroundWashColorMode,options:[{value:`theme`,label:e(`options.monetBackgroundWashTheme`)},{value:`custom`,label:e(`options.monetBackgroundWashCustom`)}],onChange:e=>n?.({backgroundWashColorMode:e})})}),(0,L.jsx)(A,{when:m.backgroundWashColorMode===`custom`,children:(0,L.jsxs)(j,{sub:!0,label:e(`options.monetBackgroundWashCustomColor`),below:(0,L.jsx)(Zi,{color:m.backgroundWashCustomColor,onChange:e=>n?.({backgroundWashCustomColor:e}),style:{width:`100%`,height:180}}),children:[(0,L.jsx)(`span`,{className:`h-4 w-4 rounded-full shadow-[0_0_0_1px_var(--st-line)]`,style:{backgroundColor:m.backgroundWashCustomColor}}),(0,L.jsx)(le,{children:m.backgroundWashCustomColor.toUpperCase()})]})})]})]})},oa=new Map,sa=(e,t,n)=>Math.min(n,Math.max(t,e)),ca=({coverUrl:e,monetBackgroundImage:t,tuning:n})=>n.backgroundSource===`uploaded-global`?t?.url??e??null:e??t?.url??null,la=async e=>{let t=new Image;(e.startsWith(`http://`)||e.startsWith(`https://`))&&(t.crossOrigin=`anonymous`),t.decoding=`async`;let n=new Promise((n,r)=>{t.onload=()=>n(),t.onerror=()=>r(Error(`Failed to load image: ${e}`))});t.src=e;try{await t.decode()}catch{await n}return t},ua=({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:r})=>JSON.stringify({sourceUrl:ca({coverUrl:e,monetBackgroundImage:t,tuning:r}),uploadedId:r.backgroundSource===`uploaded-global`?t?.id??null:null,theme:{backgroundColor:n.backgroundColor,primaryColor:n.primaryColor,accentColor:n.accentColor},tuning:{backgroundSource:r.backgroundSource,backgroundBlurPx:r.backgroundBlurPx,backgroundOverlayOpacity:r.backgroundOverlayOpacity,backgroundGrayscale:r.backgroundGrayscale,backgroundSaturation:r.backgroundSaturation,backgroundWash:r.backgroundWash,backgroundWashColorMode:r.backgroundWashColorMode,backgroundWashCustomColor:r.backgroundWashCustomColor,backgroundStreaksEnabled:r.backgroundStreaksEnabled}}),da=null,fa=()=>{if(da!==null)return da;if(typeof document>`u`)return!1;try{let e=document.createElement(`canvas`);e.width=2,e.height=2;let t=e.getContext(`2d`);return!t||typeof t.filter!=`string`?(da=!1,!1):(t.fillStyle=`#000000`,t.fillRect(0,0,2,2),t.filter=`blur(1px)`,t.fillStyle=`#ffffff`,t.fillRect(0,0,1,1),da=t.getImageData(1,1,1,1).data[0]>0,da)}catch{return da=!1,!1}},pa=null,ma=0,ha=null,ga=[],_a=()=>{for(;!ha&&ga.length>0;){let e=ga.shift();if(!e.wanted()){e.request.image.close(),e.settle(void 0);continue}let t=ma+=1;ha={...e,id:t};try{ya().postMessage({...e.request,id:t},{transfer:[e.request.image]})}catch{ha=null,e.request.image.close(),e.settle(null)}}},va=e=>{let t=ha;ha=null,t?.settle(e),_a()},ya=()=>{if(pa)return pa;let e=new Worker(new URL(`/assets/monetBackground.worker-BdbhyxNv.js`,``+import.meta.url),{type:`module`});return e.onmessage=e=>{e.data.id===ha?.id&&va(`picture`in e.data?e.data.picture:null)},e.onerror=()=>{e.terminate(),pa=null,va(null)},pa=e,e},ba=(e,t)=>new Promise(n=>{ga.push({request:e,wanted:t,settle:n}),_a()}),xa=async({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:r},i)=>{let a=ca({coverUrl:e,monetBackgroundImage:t,tuning:r});if(!a)return null;let o=await ba({image:await createImageBitmap(await la(a)),colors:{backgroundColor:n.backgroundColor,primaryColor:n.primaryColor,accentColor:n.accentColor},tuning:r,blurPx:fa()?sa(r.backgroundBlurPx,0,60):null},i);if(!o)return o;let s=URL.createObjectURL(o),c=new Image;c.src=s;try{await c.decode()}catch(e){throw URL.revokeObjectURL(s),e}return s},Sa=e=>{let t=ua(e),n=oa.get(t);if(!n){let r={url:Promise.resolve(null),holders:0};r.url=xa(e,()=>r.holders>0||(oa.get(t)===r&&oa.delete(t),!1)).then(e=>e??null,()=>null),oa.set(t,r),n=r}let r=n;r.holders+=1;let i=!1;return{url:r.url,release:()=>{i||(i=!0,--r.holders)}}},Ca=240,wa=76,Ta=156,Ea=3.4,Da=.035,Oa=.01,ka=12.9898,Aa=78.233,ja=39.425,Ma=(e,t)=>(e%t+t)%t,Na=(e,t)=>{let n=Math.sin(e*127.1+t*311.7)*43758.5453;return n-Math.floor(n)},Pa=e=>e*e*(3-2*e),Fa=(e,t,n)=>{let r=Math.floor(e),i=Na(Ma(r,t),n);return i+(Na(Ma(r+1,t),n)-i)*Pa(e-r)},Ia=(e,t)=>{let n=Fa(e,wa,t),r=Fa(e*2,152,t+17.31);return(n*.68+r*.32)*2-1},La=e=>{let t=e.reduce((e,t)=>Math.max(e,Math.abs(t)),0);return t>0?e.map(e=>e/t):e},Ra=e=>{let t=Math.min(1,Math.max(0,e)),n=Ea*t,r=1+n/100*2+Oa,i=Da*t,a=[],o=[],s=[];for(let e=0;e<=Ta;e+=1){let t=wa*e/Ta;a.push(Ia(t,ka)),o.push(Ia(t,Aa)),s.push(Ia(t,ja))}let c=La(a),l=La(o),u=La(s);return{keyframes:c.map((e,t)=>({transform:`translate3d(${(e*n).toFixed(4)}%, ${(l[t]*n).toFixed(4)}%, 0) scale(${(r+i*((u[t]+1)/2)).toFixed(5)})`})),durationMs:Ca*1e3,maxTravelPercent:n,minScale:r}};_(),y();var za=180,Ba=(e,t,n)=>Math.min(n,Math.max(t,e)),Va=(e,t,n,r)=>{(0,I.useEffect)(()=>{let i=e.current;if(!i||!t||n<=0||typeof i.animate!=`function`||r)return;let a=Ra(n),o=i.animate(a.keyframes,{duration:a.durationMs,iterations:1/0,easing:`linear`});return()=>o.cancel()},[t,e,n,r])},Ha=(e,t,n)=>n.backgroundSource===`uploaded-global`?t?.url??e??null:e??t?.url??null,Ua=({coverUrl:e,monetBackgroundImage:t,theme:n,isDaylight:r=!1,tuning:i=k,transparentBackground:a=!1,staticMode:o=!1})=>{let[s,c]=(0,I.useState)(null),[l,u]=(0,I.useState)(!1),d=Ha(e,t,i),f=Ge(),[p,m]=(0,I.useState)(null),h=(0,I.useRef)(null),g=(0,I.useMemo)(()=>`linear-gradient(135deg, ${T(n.accentColor,.22)}, ${T(n.backgroundColor,.96)} 50%, ${T(n.primaryColor,.18)})`,[n]),_=(0,I.useMemo)(()=>`linear-gradient(90deg, ${T(n.backgroundColor,.18)} 0%, ${T(n.backgroundColor,.32)} 34%, ${T(n.backgroundColor,.66)} 70%, ${T(n.backgroundColor,.82)} 100%)`,[n]),v=(0,I.useMemo)(()=>ua({coverUrl:e,monetBackgroundImage:t,theme:n,tuning:i}),[e,t,n,i]);(0,I.useEffect)(()=>{let r=!1,o;if(!d||a)return c(null),u(!1),f(),()=>{r=!0};u(!0);let s={coverUrl:e,monetBackgroundImage:t,theme:n,tuning:i},l=d===h.current?null:Sa(s),p=null;return o=window.setTimeout(()=>{p=Sa(s),p.url.then(e=>{r||(c(t=>t===e?t:e),u(!1),h.current=d,e&&m(t=>t??e),f())})},za),()=>{r=!0,o!==void 0&&window.clearTimeout(o),l?.release(),p?.release()}},[v,d,a,f]);let y=(0,I.useRef)(null),b=Ba(i.backgroundDriftStrength??0,0,1),x=!!i.backgroundDriftEnabled&&!o&&b>0;Va(y,x,b,te(`monetBackground`));let S=(0,I.useMemo)(()=>x?{willChange:`transform`}:void 0,[x]),E=(0,I.useMemo)(()=>fa(),[])?0:i.backgroundBlurPx,D=(0,I.useMemo)(()=>E<=0?{}:{filter:`blur(${E}px)`,WebkitFilter:`blur(${E}px)`,transform:`scale(1.1) translateZ(0)`},[E]);if(a)return null;let ee=s?`url(${s})`:d?`linear-gradient(135deg, ${T(n.accentColor,.2)}, ${T(n.backgroundColor,.78)}), url(${d})`:g,O=l?{[ke]:``}:{},A=s||d||`fallback`,j=A!==p&&{opacity:0};if(i.backgroundLayout===`full-overlay`)return(0,L.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,...O,children:[(0,L.jsx)(`div`,{ref:y,className:`absolute inset-0`,style:S,children:(0,L.jsx)(C,{initial:!1,children:(0,L.jsx)(w.div,{initial:j,animate:{opacity:1},exit:{opacity:0},transition:{duration:.8,ease:`easeInOut`},className:`absolute inset-0`,style:{backgroundColor:n.backgroundColor,backgroundImage:ee,backgroundSize:`cover`,backgroundPosition:`center`,...D}},A)})}),(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{background:_}})]});let ne=(r?.7:.3)+Ba(i.backgroundOverlayOpacity,0,1)*.16,re=Ba(50+i.backgroundHalfPaneOffsetX,10,90);return(0,L.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,...O,children:[(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:n.backgroundColor,backgroundImage:g}}),(0,L.jsx)(C,{initial:!1,children:s||d?(0,L.jsx)(`div`,{className:`absolute inset-y-0 left-0 w-[72%] sm:w-[68%] lg:w-[60%] overflow-hidden`,style:{WebkitMaskImage:`linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 48%, rgba(0,0,0,0.46) 74%, rgba(0,0,0,0) 100%)`,maskImage:`linear-gradient(90deg, rgba(0,0,0,1) 0%, rgba(0,0,0,0.94) 48%, rgba(0,0,0,0.46) 74%, rgba(0,0,0,0) 100%)`},children:(0,L.jsx)(`div`,{ref:y,className:`absolute inset-0`,style:S,children:(0,L.jsx)(w.div,{initial:j,animate:{opacity:ne},exit:{opacity:0},transition:{duration:.8,ease:`easeInOut`},className:`absolute inset-0`,style:{backgroundImage:ee,backgroundRepeat:`no-repeat`,backgroundSize:`cover`,backgroundPosition:`${re}% center`,...D}},A)})}):null}),(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{background:`linear-gradient(90deg, ${T(n.backgroundColor,.14)} 0%, ${T(n.backgroundColor,.28)} 28%, ${T(n.backgroundColor,.62)} 64%, ${T(n.backgroundColor,.86)} 100%)`}}),(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundImage:`radial-gradient(circle at 18% 34%, ${T(n.accentColor,.18)}, transparent 36%)`,backgroundSize:`cover`,backgroundPosition:`center`}}),(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{background:_}})]})},Wa=t({default:()=>Ka});y();var Ga={"cover-derived":`options.monetBackgroundSourceCover`,"uploaded-global":`options.monetBackgroundSourceUploaded`},Ka=ve({mode:`monet`,order:20,labelKey:`options.visualizerBackgroundModeMonet`,labelFallback:`Monet`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`rect`,{x:`3.5`,y:`4.5`,width:`17`,height:`15`,rx:`2`}),(0,L.jsx)(`path`,{d:`M20.5 8.5L8 19.5`,opacity:`0.55`})]}),song:({config:e,coverUrl:t})=>[Ha(t,e?.customImage,e?.monet?.tuning??k)],render:({config:e,coverUrl:t,theme:n,isDaylight:r,staticMode:i})=>(0,L.jsx)(Ua,{coverUrl:t,monetBackgroundImage:e?.customImage,theme:n,isDaylight:r,tuning:e?.monet?.tuning,transparentBackground:e?.transparent,staticMode:i}),renderSettingsPanel:({config:e,actions:t,t:n,onSliderPointerDown:r,onSliderCommit:i})=>(0,L.jsx)(aa,{t:n,tuning:e?.monet?.tuning??k,onTuningChange:t?.monet?.onTuningChange,monetBackgroundImage:e?.customImage,onUploadMonetBackgroundImage:t?.customImage?.onUpload,onClearMonetBackgroundImage:t?.customImage?.onClear,isLoadingMonetBackgroundImage:t?.customImage?.isLoading,onSliderPointerDown:r,onSliderCommit:i}),renderQuickControls:({config:e,actions:t,t:n})=>{let r=e?.monet?.tuning??k,i=r.backgroundLayout===`full-overlay`,a=n(i?`options.monetLayoutFullOverlay`:`options.monetLayoutHalfPane`),o=e=>t?.monet?.onTuningChange?.(e),s=r.backgroundSource,l=n(Ga[s]),u=!!e?.customImage;return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(oe,{label:a,title:`${n(`options.monetBackgroundLayout`)}: ${a}`,onClick:()=>o({backgroundLayout:i?`half-pane-gradient`:`full-overlay`})}),(0,L.jsx)(oe,{label:l,title:`${n(`options.monetBackgroundSource`)}: ${l}`,disabled:!u&&s===`cover-derived`,onClick:()=>o({backgroundSource:u&&s===`cover-derived`?`uploaded-global`:`cover-derived`})}),(0,L.jsx)(ce,{active:r.backgroundStreaksEnabled,label:n(`options.monetBackgroundStreaksEnabled`),onToggle:()=>o({backgroundStreaksEnabled:!r.backgroundStreaksEnabled}),children:(0,L.jsx)(f,{size:14})}),(0,L.jsx)(ce,{active:r.backgroundDriftEnabled,label:n(`options.monetBackgroundDriftEnabled`),onToggle:()=>o({backgroundDriftEnabled:!r.backgroundDriftEnabled}),children:(0,L.jsx)(c,{size:14})})]})},resetSettings:e=>e?.monet?.onResetTuning?.()}),qa=1.8,Ja=.01,Ya=16/9,Xa={fiberSize:.2,crumples:.35,crumpleSize:.35,folds:.65,foldCount:5,drops:.2,seed:5.8},Za={perspective:.4,count:20,focusCenter:.55,focusEdges:.8,swirl:.08,lensCircle:.1},Qa=e=>Math.min(1,Math.max(0,e)),$a=e=>Math.min(qa,Math.max(1,e)),eo=e=>e<=1?1:$a(e+Ja),to=e=>eo(1/(1-2*Math.min(Math.max(e,0),.45))),no=(e,t,n)=>n&&!t?!e:e,ro=(e,t,n)=>no(!e,t,n),io=(e,t)=>{let{folds:n,crumples:r,drops:i}=Xa;return to(.02*(2*n+1.5*r+.2*i+.75*Qa(e)+.1*Qa(t)))},ao=(e,t)=>{let n=.5*Math.hypot(Ya,1),r=Qa(t),i=.7*r**(1.3+2.7*r)*(1-Za.focusEdges),a=Math.max(.35,1-i/n);if(e<=0)return eo(1/a);let o=Math.min(e,1)*1.4,s=e=>{let t=2*n/e;return Math.tan(t*o)/Math.tan(o)/t},c=Math.max(1,2*n*o/1.45);if(c>=qa||s(qa)>qa*a)return qa;if(c===1&&s(1)<=a)return eo(1/a);let l=qa;for(let e=0;e<32;e+=1){let e=(c+l)/2;s(e)>e*a?c=e:l=e}return eo(l)};y();var oo=(e,t)=>{let n=Ge();(0,I.useEffect)(()=>{if(t===null){n();return}let r=0,i=()=>{r=requestAnimationFrame(e.current?.paperShaderMount?n:i)};return i(),()=>cancelAnimationFrame(r)},[e,t,n])},so=(e,t,n)=>n.imageSource===`uploaded-global`?t?.url??e:e??t?.url,co=I.memo(({coverUrl:e,monetBackgroundImage:t,tuning:n,theme:r,isDaylight:i})=>{let a={...O,...n},o=so(e,t,a),s=(0,I.useRef)(null);return oo(s,o?`${o}:${a.effect}`:null),o?(0,L.jsxs)(`div`,{className:`absolute inset-0 z-0 overflow-hidden`,style:{backgroundColor:r.backgroundColor,pointerEvents:`none`},children:[(()=>{let e={width:`100%`,height:`100%`,ref:s,image:o,fit:`cover`,minPixelRatio:1,maxPixelCount:2073600,webGlContextAttributes:lr,style:{width:`100%`,height:`100%`}};switch(a.effect){case`fluted-glass`:return(0,L.jsx)(qn,{...e,colorBack:r.backgroundColor,colorShadow:r.secondaryColor,colorHighlight:r.primaryColor,shadows:.25,size:a.flutedGlassSize,distortion:a.flutedGlassDistortion,blur:a.flutedGlassBlur,shape:`lines`,distortionShape:`prism`,highlights:.1,edges:.25},`${o}:fluted-glass`);case`paper-texture`:return(0,L.jsx)(Kn,{...e,...Xa,colorFront:r.accentColor,colorBack:r.backgroundColor,contrast:a.paperTextureContrast,roughness:a.paperTextureRoughness,fiber:a.paperTextureFiber,scale:io(a.paperTextureRoughness,a.paperTextureFiber)},`${o}:paper-texture`);case`halftone-dots`:return(0,L.jsx)(Xn,{...e,colorBack:r.backgroundColor,colorFront:r.accentColor,size:a.halftoneDotsSize,radius:a.halftoneDotsRadius,contrast:a.halftoneDotsContrast,originalColors:a.halftoneDotsOriginalColors,inverted:ro(a.halftoneDotsInverted,a.halftoneDotsOriginalColors,i),grid:`hex`,type:`gooey`,grainMixer:.12,grainOverlay:.06,grainSize:.5},`${o}:halftone-dots`);case`lens-distortion`:return(0,L.jsx)(Yn,{...e,...Za,spread:a.lensDistortionSpread,dispersion:a.lensDistortionDispersion,lensBulge:a.lensDistortionBulge,scale:ao(a.lensDistortionBulge,a.lensDistortionSpread)},`${o}:lens-distortion`);default:return(0,L.jsx)(Jn,{...e,colorBack:r.backgroundColor,colorFront:r.accentColor,colorHighlight:r.primaryColor,originalColors:a.originalColors,inverted:no(a.inverted,a.originalColors,i),type:a.ditheringType,size:a.size,colorSteps:a.colorSteps},`${o}:dithering`)}})(),a.overlayEnabled&&a.overlayOpacity>0&&(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{backgroundColor:r.backgroundColor,opacity:a.overlayOpacity}})]}):(0,L.jsx)(`div`,{className:`absolute inset-0 z-0`,style:{backgroundColor:r.backgroundColor}})}),lo=[`2x2`,`4x4`,`8x8`],uo=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(j,{label:e(`options.nomandBackgroundDitheringType`),children:(0,L.jsx)(re,{value:t.ditheringType,options:lo.map(e=>({value:e,label:e})),onChange:e=>n?.({ditheringType:e})})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundSize`),value:t.size,min:.5,max:20,step:.5,format:e=>e.toFixed(1),onChange:e=>n?.({size:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundColorSteps`),value:t.colorSteps,min:1,max:7,step:1,format:e=>String(Math.round(e)),onChange:e=>n?.({colorSteps:e})}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundOriginalColors`),checked:t.originalColors,onChange:e=>n?.({originalColors:e})}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundInverted`),checked:t.inverted,onChange:e=>n?.({inverted:e})})]})},fo=e=>e.toFixed(2),po=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundFlutedGlassSize`),value:t.flutedGlassSize,min:.1,max:1,step:.05,format:fo,onChange:e=>n?.({flutedGlassSize:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundFlutedGlassDistortion`),value:t.flutedGlassDistortion,min:0,max:1,step:.05,format:P,onChange:e=>n?.({flutedGlassDistortion:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundFlutedGlassBlur`),value:t.flutedGlassBlur,min:0,max:1,step:.01,format:P,onChange:e=>n?.({flutedGlassBlur:e})})]})},mo=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundHalftoneDotsSize`),value:t.halftoneDotsSize,min:.1,max:1,step:.05,format:fo,onChange:e=>n?.({halftoneDotsSize:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundHalftoneDotsRadius`),value:t.halftoneDotsRadius,min:.1,max:2,step:.05,format:fo,onChange:e=>n?.({halftoneDotsRadius:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundHalftoneDotsContrast`),value:t.halftoneDotsContrast,min:0,max:1,step:.05,format:P,onChange:e=>n?.({halftoneDotsContrast:e})}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundOriginalColors`),checked:t.halftoneDotsOriginalColors,onChange:e=>n?.({halftoneDotsOriginalColors:e})}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundInverted`),checked:t.halftoneDotsInverted,onChange:e=>n?.({halftoneDotsInverted:e})})]})},ho=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundLensDistortionSpread`),value:t.lensDistortionSpread,min:0,max:1,step:.05,format:P,onChange:e=>n?.({lensDistortionSpread:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundLensDistortionBulge`),value:t.lensDistortionBulge,min:-1,max:1,step:.05,format:fo,onChange:e=>n?.({lensDistortionBulge:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundLensDistortionDispersion`),value:t.lensDistortionDispersion,min:0,max:1,step:.05,format:P,onChange:e=>n?.({lensDistortionDispersion:e})})]})},go=({t:e,tuning:t,onTuningChange:n,onSliderPointerDown:r,onSliderCommit:i})=>{let a={onDragStart:r,onDragEnd:i};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundPaperTextureContrast`),value:t.paperTextureContrast,min:0,max:1,step:.01,format:P,onChange:e=>n?.({paperTextureContrast:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundPaperTextureRoughness`),value:t.paperTextureRoughness,min:0,max:1,step:.01,format:P,onChange:e=>n?.({paperTextureRoughness:e})}),(0,L.jsx)(N,{...a,label:e(`options.nomandBackgroundPaperTextureFiber`),value:t.paperTextureFiber,min:0,max:1,step:.05,format:P,onChange:e=>n?.({paperTextureFiber:e})})]})},_o={id:`bg-nomand-effect`,titleKey:`options.nomandBackgroundEffect`},vo=[`dithering`,`fluted-glass`,`paper-texture`,`halftone-dots`,`lens-distortion`],yo={dithering:`options.nomandBackgroundEffectDithering`,"fluted-glass":`options.nomandBackgroundEffectFlutedGlass`,"paper-texture":`options.nomandBackgroundEffectPaperTexture`,"halftone-dots":`options.nomandBackgroundEffectHalftoneDots`,"lens-distortion":`options.nomandBackgroundEffectLensDistortion`},bo={dithering:{backgroundImage:`conic-gradient(var(--st-t2) 25%, transparent 0 50%, var(--st-t2) 0 75%, transparent 0)`,backgroundSize:`8px 8px`},"fluted-glass":{backgroundImage:`repeating-linear-gradient(90deg, transparent 0 2px, var(--st-t2) 5px, transparent 8px)`},"paper-texture":{backgroundImage:`repeating-linear-gradient(37deg, transparent 0 3px, var(--st-t3) 3px 4px), repeating-linear-gradient(-58deg, transparent 0 5px, var(--st-t3) 5px 6px)`},"halftone-dots":{backgroundImage:`radial-gradient(var(--st-t2) 32%, transparent 36%)`,backgroundSize:`8px 8px`},"lens-distortion":{backgroundImage:`radial-gradient(circle at 50% 50%, transparent 0 22%, var(--st-t2) 24% 28%, transparent 30% 46%, var(--st-t3) 48% 52%, transparent 54%)`}},xo=e=>(0,L.jsx)(`span`,{className:`absolute inset-0`,style:bo[e]}),So=e=>{let{t,tuning:n}=e;return(0,L.jsxs)(M,{def:_o,children:[(0,L.jsx)(j,{below:(0,L.jsx)(ae,{className:`-mx-4`,columns:3,label:t(`options.nomandBackgroundEffect`),value:n.effect,options:vo.map(e=>({value:e,label:t(yo[e])})),picture:xo,onChange:t=>e.onTuningChange?.({effect:t})})}),n.effect===`dithering`&&(0,L.jsx)(uo,{...e}),n.effect===`fluted-glass`&&(0,L.jsx)(po,{...e}),n.effect===`paper-texture`&&(0,L.jsx)(go,{...e}),n.effect===`halftone-dots`&&(0,L.jsx)(mo,{...e}),n.effect===`lens-distortion`&&(0,L.jsx)(ho,{...e})]})};y();var Co={id:`bg-nomand`,titleKey:`options.nomandBackgroundSettings`},wo=({t:e,tuning:t,onTuningChange:n,monetBackgroundImage:a,onUploadMonetBackgroundImage:o,onClearMonetBackgroundImage:s,isLoadingMonetBackgroundImage:c=!1,onSliderPointerDown:l,onSliderCommit:u})=>{let d={...O,...t},f=(0,I.useRef)(null),[p,m]=(0,I.useState)(``),h=e=>{n?.({imageSource:e})},g=async t=>{if(!t.length||!o)return;let n=await o(t);m(n.ok?e(`options.nomandBackgroundUploadSuccess`):n.error??e(`options.nomandBackgroundUploadFailed`)),n.ok&&h(`uploaded-global`)};return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsxs)(M,{def:Co,children:[(0,L.jsx)(j,{label:e(`options.nomandBackgroundSource`),children:(0,L.jsx)(re,{value:d.imageSource,options:[{value:`cover-derived`,label:e(`options.monetBackgroundSourceCover`)},{value:`uploaded-global`,label:e(`options.monetBackgroundSourceUploaded`),disabled:!a&&!c}],onChange:h})}),(0,L.jsxs)(j,{label:e(`options.monetUploadBackground`),hint:p||a?.name||`-`,children:[(0,L.jsx)(se,{icon:r,disabled:c||!o,onClick:()=>f.current?.click(),children:e(`options.monetUploadBackground`)}),(0,L.jsx)(se,{icon:i,disabled:!a||!s,onClick:()=>void s?.(),children:e(`options.monetClearBackground`)}),(0,L.jsx)(`input`,{ref:f,type:`file`,accept:`image/png,image/jpeg,image/webp,image/gif`,className:`hidden`,onChange:e=>{g(Array.from(e.target.files??[])),e.target.value=``}})]}),(0,L.jsx)(F,{label:e(`options.nomandBackgroundOverlay`),note:e(`options.nomandBackgroundOverlayDesc`),checked:d.overlayEnabled,onChange:e=>n?.({overlayEnabled:e})}),(0,L.jsx)(A,{when:d.overlayEnabled,children:(0,L.jsx)(N,{sub:!0,label:e(`options.nomandBackgroundOverlayOpacity`),value:d.overlayOpacity,min:0,max:1,step:.05,format:P,onChange:e=>n?.({overlayOpacity:e}),onDragStart:l,onDragEnd:u})})]}),(0,L.jsx)(So,{t:e,tuning:d,onTuningChange:n,onSliderPointerDown:l,onSliderCommit:u})]})},To=t({default:()=>Do});y();var Eo={"cover-derived":`options.monetBackgroundSourceCover`,"uploaded-global":`options.monetBackgroundSourceUploaded`},Do=ve({mode:`nomand`,order:30,labelKey:`options.visualizerBackgroundModeNomand`,labelFallback:`Nomand`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`rect`,{x:`4`,y:`4`,width:`6.5`,height:`6.5`,rx:`0.8`}),(0,L.jsx)(`rect`,{x:`13.5`,y:`4`,width:`6.5`,height:`6.5`,rx:`0.8`,opacity:`0.45`}),(0,L.jsx)(`rect`,{x:`4`,y:`13.5`,width:`6.5`,height:`6.5`,rx:`0.8`,opacity:`0.45`}),(0,L.jsx)(`rect`,{x:`13.5`,y:`13.5`,width:`6.5`,height:`6.5`,rx:`0.8`})]}),command:{title:`Background: Nomand`,description:`Switch background to theme-colored image dithering`,keywords:[`nomand`,`dithering`,`dither`,`shader background`,`漫游`,`像素画`,`像素画背景`,`抖动背景`,`网点背景`,`主题色背景`]},song:({config:e,coverUrl:t})=>[so(t,e?.customImage,{...O,...e?.nomand?.tuning})??null],render:({config:e,coverUrl:t,theme:n,isDaylight:r})=>(0,L.jsx)(co,{coverUrl:t,monetBackgroundImage:e?.customImage,tuning:e?.nomand?.tuning,theme:n,isDaylight:r}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,L.jsx)(wo,{...n,tuning:e?.nomand?.tuning??O,onTuningChange:t?.nomand?.onTuningChange,monetBackgroundImage:e?.customImage,onUploadMonetBackgroundImage:t?.customImage?.onUpload,onClearMonetBackgroundImage:t?.customImage?.onClear,isLoadingMonetBackgroundImage:t?.customImage?.isLoading}),renderQuickControls:({config:e,actions:t,t:n})=>{let r=e?.nomand?.tuning??O,i=e=>t?.nomand?.onTuningChange?.(e),a=r.imageSource,o=n(Eo[a]),s=!!e?.customImage,c=n(yo[r.effect]);return(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(oe,{label:o,title:`${n(`options.nomandBackgroundSource`)}: ${o}`,disabled:!s&&a===`cover-derived`,onClick:()=>i({imageSource:s&&a===`cover-derived`?`uploaded-global`:`cover-derived`})}),(0,L.jsx)(oe,{label:c,title:`${n(`options.nomandBackgroundEffect`)}: ${c}`,onClick:()=>i({effect:ie(vo,r.effect)})}),(0,L.jsx)(ce,{active:r.overlayEnabled,label:n(`options.nomandBackgroundOverlay`),onToggle:()=>i({overlayEnabled:!r.overlayEnabled}),children:(0,L.jsx)(d,{size:14})})]})},resetSettings:e=>e?.nomand?.onResetTuning?.()}),Oo=5120,ko=5121,Ao=5122,jo=5123,Mo=5124,No=5125,Po=5126,Fo=32819,Io=32820,Lo=33635,Ro=5131,zo=33640,Bo=35899,Vo=35902,Ho=36269,Uo=34042,Wo={};{let e=Wo;e[Oo]=Int8Array,e[ko]=Uint8Array,e[Ao]=Int16Array,e[jo]=Uint16Array,e[Mo]=Int32Array,e[No]=Uint32Array,e[Po]=Float32Array,e[Fo]=Uint16Array,e[Io]=Uint16Array,e[Lo]=Uint16Array,e[Ro]=Uint16Array,e[zo]=Uint32Array,e[Bo]=Uint32Array,e[Vo]=Uint32Array,e[Ho]=Uint32Array,e[Uo]=Uint32Array}function Go(e){if(e instanceof Int8Array)return Oo;if(e instanceof Uint8Array||e instanceof Uint8ClampedArray)return ko;if(e instanceof Int16Array)return Ao;if(e instanceof Uint16Array)return jo;if(e instanceof Int32Array)return Mo;if(e instanceof Uint32Array)return No;if(e instanceof Float32Array)return Po;throw Error(`unsupported typed array type`)}function Ko(e){if(e===Int8Array)return Oo;if(e===Uint8Array||e===Uint8ClampedArray)return ko;if(e===Int16Array)return Ao;if(e===Uint16Array)return jo;if(e===Int32Array)return Mo;if(e===Uint32Array)return No;if(e===Float32Array)return Po;throw Error(`unsupported typed array type`)}function qo(e){let t=Wo[e];if(!t)throw Error(`unknown gl type`);return t}var Jo=typeof SharedArrayBuffer<`u`?function(e){return e&&e.buffer&&(e.buffer instanceof ArrayBuffer||e.buffer instanceof SharedArrayBuffer)}:function(e){return e&&e.buffer&&e.buffer instanceof ArrayBuffer};function Yo(...e){console.error(...e)}function Xo(...e){console.warn(...e)}var Zo=new Map;function Qo(e,t){if(!e||typeof e!=`object`)return!1;let n=Zo.get(t);n||(n=new WeakMap,Zo.set(t,n));let r=n.get(e);if(r===void 0){let i=Object.prototype.toString.call(e);r=i.substring(8,i.length-1)===t,n.set(e,r)}return r}function $o(e,t){return typeof WebGLBuffer<`u`&&Qo(t,`WebGLBuffer`)}function es(e,t){return typeof WebGLTexture<`u`&&Qo(t,`WebGLTexture`)}var ts=35044,ns=34962,rs=34963,is=34660,as=5120,os=5121,ss=5122,cs=5123,ls=5124,us=5125,ds=5126,fs={attribPrefix:``};function ps(e,t,n,r,i){e.bindBuffer(t,n),e.bufferData(t,r,i||ts)}function ms(e,t,n,r){if($o(e,t))return t;n||=ns;let i=e.createBuffer();return ps(e,n,i,t,r),i}function hs(e){return e===`indices`}function gs(e){return e===Int8Array||e===Uint8Array}function _s(e){return e.length?e:e.data}var vs=/coord|texture/i,ys=/color|colour/i;function bs(e,t){let n;if(n=vs.test(e)?2:ys.test(e)?4:3,t%n>0)throw Error(`Can not guess numComponents for attribute '${e}'. Tried ${n} but ${t} values is not evenly divisible by ${n}. You should specify it.`);return n}function xs(e,t,n){return e.numComponents||e.size||bs(t,n||_s(e).length)}function Ss(e,t){if(Jo(e))return e;if(Jo(e.data))return e.data;Array.isArray(e)&&(e={data:e});let n=e.type?ws(e.type):void 0;return n||=hs(t)?Uint16Array:Float32Array,new n(e.data)}function Cs(e){return typeof e==`number`?e:e?Ko(e):ds}function ws(e){return typeof e==`number`?qo(e):e||Float32Array}function Ts(e,t){return{buffer:t.buffer,numValues:24,type:Cs(t.type),arrayType:ws(t.type)}}function Es(e,t){let n=t.data||t,r=ws(t.type),i=n*r.BYTES_PER_ELEMENT,a=e.createBuffer();return e.bindBuffer(ns,a),e.bufferData(ns,i,t.drawType||ts),{buffer:a,numValues:n,type:Ko(r),arrayType:r}}function Ds(e,t,n){let r=Ss(t,n);return{arrayType:r.constructor,buffer:ms(e,r,void 0,t.drawType),type:Go(r),numValues:0}}function Os(e,t){let n={};return Object.keys(t).forEach(function(r){if(!hs(r)){let i=t[r],a=i.attrib||i.name||i.attribName||fs.attribPrefix+r;if(i.value){if(!Array.isArray(i.value)&&!Jo(i.value))throw Error(`array.value is not array or typedarray`);n[a]={value:i.value}}else{let t;t=i.buffer&&i.buffer instanceof WebGLBuffer?Ts:typeof i==`number`||typeof i.data==`number`?Es:Ds;let{buffer:o,type:s,numValues:c,arrayType:l}=t(e,i,r),u=i.normalize===void 0?gs(l):i.normalize,d=xs(i,r,c);n[a]={buffer:o,numComponents:d,type:s,normalize:u,stride:i.stride||0,offset:i.offset||0,divisor:i.divisor===void 0?void 0:i.divisor,drawType:i.drawType}}}}),e.bindBuffer(ns,null),n}function ks(e,t){return t===as||t===os?1:t===ss||t===cs?2:t===ls||t===us||t===ds?4:0}var As=[`position`,`positions`,`a_position`];function js(e,t){let n,r=0;for(;r<As.length&&(n=As[r],!(n in t||(n=fs.attribPrefix+n,n in t)));++r);r===As.length&&(n=Object.keys(t)[0]);let i=t[n];if(!i.buffer)return 1;e.bindBuffer(ns,i.buffer);let a=e.getBufferParameter(ns,is);e.bindBuffer(ns,null);let o=a/ks(e,i.type),s=i.numComponents||i.size,c=o/s;if(c%1!=0)throw Error(`numComponents ${s} not correct for length ${length}`);return c}function Ms(e,t,n){let r=Os(e,t),i=Object.assign({},n||{});i.attribs=Object.assign({},n?n.attribs:{},r);let a=t.indices;if(a){let t=Ss(a,`indices`);i.indices=ms(e,t,rs),i.numElements=t.length,i.elementType=Go(t)}else i.numElements||=js(e,i.attribs);return i}function Ns(e){return!!e.texStorage2D}var Ps=function(){let e={},t={};function n(n){let r=n.constructor.name;if(!e[r]){for(let e in n)if(typeof n[e]==`number`){let r=t[n[e]];t[n[e]]=r?`${r} | ${e}`:e}e[r]=!0}}return function(e,r){return n(e),t[r]||(typeof r==`number`?`0x${r.toString(16)}`:r)}}();new Uint8Array([128,192,255,255]);var Fs=6406,Is=6407,Ls=6408,Rs=6409,zs=6410,Bs=6402,Vs=34041,Hs=33319,Us=33320,Ws=6403,Gs=36244,Ks=36248,qs=36249,Js={};{let e=Js;e[Fs]={numColorComponents:1},e[Rs]={numColorComponents:1},e[zs]={numColorComponents:2},e[Is]={numColorComponents:3},e[Ls]={numColorComponents:4},e[Ws]={numColorComponents:1},e[Gs]={numColorComponents:1},e[Hs]={numColorComponents:2},e[Us]={numColorComponents:2},e[Is]={numColorComponents:3},e[Ks]={numColorComponents:3},e[Ls]={numColorComponents:4},e[qs]={numColorComponents:4},e[Bs]={numColorComponents:1},e[Vs]={numColorComponents:2}}var Ys=Yo;function Xs(e){return typeof document<`u`&&document.getElementById?document.getElementById(e):null}var Zs=33984,Qs=34962,$s=34963,ec=35713,tc=35714,nc=35632,rc=35633,ic=35981,ac=35718,oc=35721,sc=35971,cc=35382,lc=35396,uc=35398,dc=35392,fc=35395,pc=5126,mc=35664,hc=35665,gc=35666,_c=5124,vc=35667,yc=35668,bc=35669,xc=35670,Sc=35671,Cc=35672,wc=35673,Tc=35674,Ec=35675,Dc=35676,Oc=35678,kc=35680,Ac=35679,jc=35682,Mc=35685,Nc=35686,Pc=35687,Fc=35688,Ic=35689,Lc=35690,Rc=36289,zc=36292,Bc=36293,Vc=5125,Hc=36294,Uc=36295,Wc=36296,Gc=36298,Kc=36299,qc=36300,Jc=36303,Yc=36306,Xc=36307,Zc=36308,Qc=36311,$c=3553,el=34067,tl=32879,nl=35866,X={};function rl(e,t){return X[t].bindPoint}function il(e,t){return function(n){e.uniform1f(t,n)}}function al(e,t){return function(n){e.uniform1fv(t,n)}}function ol(e,t){return function(n){e.uniform2fv(t,n)}}function sl(e,t){return function(n){e.uniform3fv(t,n)}}function cl(e,t){return function(n){e.uniform4fv(t,n)}}function ll(e,t){return function(n){e.uniform1i(t,n)}}function ul(e,t){return function(n){e.uniform1iv(t,n)}}function dl(e,t){return function(n){e.uniform2iv(t,n)}}function fl(e,t){return function(n){e.uniform3iv(t,n)}}function pl(e,t){return function(n){e.uniform4iv(t,n)}}function ml(e,t){return function(n){e.uniform1ui(t,n)}}function hl(e,t){return function(n){e.uniform1uiv(t,n)}}function gl(e,t){return function(n){e.uniform2uiv(t,n)}}function _l(e,t){return function(n){e.uniform3uiv(t,n)}}function vl(e,t){return function(n){e.uniform4uiv(t,n)}}function yl(e,t){return function(n){e.uniformMatrix2fv(t,!1,n)}}function bl(e,t){return function(n){e.uniformMatrix3fv(t,!1,n)}}function xl(e,t){return function(n){e.uniformMatrix4fv(t,!1,n)}}function Sl(e,t){return function(n){e.uniformMatrix2x3fv(t,!1,n)}}function Cl(e,t){return function(n){e.uniformMatrix3x2fv(t,!1,n)}}function wl(e,t){return function(n){e.uniformMatrix2x4fv(t,!1,n)}}function Tl(e,t){return function(n){e.uniformMatrix4x2fv(t,!1,n)}}function El(e,t){return function(n){e.uniformMatrix3x4fv(t,!1,n)}}function Dl(e,t){return function(n){e.uniformMatrix4x3fv(t,!1,n)}}function Z(e,t,n,r){let i=rl(e,t);return Ns(e)?function(t){let a,o;!t||es(e,t)?(a=t,o=null):(a=t.texture,o=t.sampler),e.uniform1i(r,n),e.activeTexture(Zs+n),e.bindTexture(i,a),e.bindSampler(n,o)}:function(t){e.uniform1i(r,n),e.activeTexture(Zs+n),e.bindTexture(i,t)}}function Q(e,t,n,r,i){let a=rl(e,t),o=new Int32Array(i);for(let e=0;e<i;++e)o[e]=n+e;return Ns(e)?function(t){e.uniform1iv(r,o),t.forEach(function(t,r){e.activeTexture(Zs+o[r]);let i,s;!t||es(e,t)?(i=t,s=null):(i=t.texture,s=t.sampler),e.bindSampler(n,s),e.bindTexture(a,i)})}:function(t){e.uniform1iv(r,o),t.forEach(function(t,n){e.activeTexture(Zs+o[n]),e.bindTexture(a,t)})}}X[pc]={Type:Float32Array,size:4,setter:il,arraySetter:al},X[mc]={Type:Float32Array,size:8,setter:ol,cols:2},X[hc]={Type:Float32Array,size:12,setter:sl,cols:3},X[gc]={Type:Float32Array,size:16,setter:cl,cols:4},X[_c]={Type:Int32Array,size:4,setter:ll,arraySetter:ul},X[vc]={Type:Int32Array,size:8,setter:dl,cols:2},X[yc]={Type:Int32Array,size:12,setter:fl,cols:3},X[bc]={Type:Int32Array,size:16,setter:pl,cols:4},X[Vc]={Type:Uint32Array,size:4,setter:ml,arraySetter:hl},X[Hc]={Type:Uint32Array,size:8,setter:gl,cols:2},X[Uc]={Type:Uint32Array,size:12,setter:_l,cols:3},X[Wc]={Type:Uint32Array,size:16,setter:vl,cols:4},X[xc]={Type:Uint32Array,size:4,setter:ll,arraySetter:ul},X[Sc]={Type:Uint32Array,size:8,setter:dl,cols:2},X[Cc]={Type:Uint32Array,size:12,setter:fl,cols:3},X[wc]={Type:Uint32Array,size:16,setter:pl,cols:4},X[Tc]={Type:Float32Array,size:32,setter:yl,rows:2,cols:2},X[Ec]={Type:Float32Array,size:48,setter:bl,rows:3,cols:3},X[Dc]={Type:Float32Array,size:64,setter:xl,rows:4,cols:4},X[Mc]={Type:Float32Array,size:32,setter:Sl,rows:2,cols:3},X[Nc]={Type:Float32Array,size:32,setter:wl,rows:2,cols:4},X[Pc]={Type:Float32Array,size:48,setter:Cl,rows:3,cols:2},X[Fc]={Type:Float32Array,size:48,setter:El,rows:3,cols:4},X[Ic]={Type:Float32Array,size:64,setter:Tl,rows:4,cols:2},X[Lc]={Type:Float32Array,size:64,setter:Dl,rows:4,cols:3},X[Oc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:$c},X[kc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:el},X[Ac]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:tl},X[jc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:$c},X[Rc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:nl},X[zc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:nl},X[Bc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:el},X[Gc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:$c},X[Kc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:tl},X[qc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:el},X[Jc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:nl},X[Yc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:$c},X[Xc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:tl},X[Zc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:el},X[Qc]={Type:null,size:0,setter:Z,arraySetter:Q,bindPoint:nl};function Ol(e,t){return function(n){if(n.value)switch(e.disableVertexAttribArray(t),n.value.length){case 4:e.vertexAttrib4fv(t,n.value);break;case 3:e.vertexAttrib3fv(t,n.value);break;case 2:e.vertexAttrib2fv(t,n.value);break;case 1:e.vertexAttrib1fv(t,n.value);break;default:throw Error(`the length of a float constant value must be between 1 and 4!`)}else e.bindBuffer(Qs,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribPointer(t,n.numComponents||n.size,n.type||pc,n.normalize||!1,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function kl(e,t){return function(n){if(n.value){if(e.disableVertexAttribArray(t),n.value.length===4)e.vertexAttrib4iv(t,n.value);else throw Error(`The length of an integer constant value must be 4!`)}else e.bindBuffer(Qs,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribIPointer(t,n.numComponents||n.size,n.type||_c,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function Al(e,t){return function(n){if(n.value){if(e.disableVertexAttribArray(t),n.value.length===4)e.vertexAttrib4uiv(t,n.value);else throw Error(`The length of an unsigned integer constant value must be 4!`)}else e.bindBuffer(Qs,n.buffer),e.enableVertexAttribArray(t),e.vertexAttribIPointer(t,n.numComponents||n.size,n.type||Vc,n.stride||0,n.offset||0),e.vertexAttribDivisor&&e.vertexAttribDivisor(t,n.divisor||0)}}function jl(e,t,n){let r=n.size,i=n.count;return function(n){e.bindBuffer(Qs,n.buffer);let a=n.size||n.numComponents||r,o=a/i,s=n.type||pc,c=X[s].size*a,l=n.normalize||!1,u=n.offset||0,d=c/i;for(let r=0;r<i;++r)e.enableVertexAttribArray(t+r),e.vertexAttribPointer(t+r,o,s,l,c,u+d*r),e.vertexAttribDivisor&&e.vertexAttribDivisor(t+r,n.divisor||0)}}var $={};$[pc]={size:4,setter:Ol},$[mc]={size:8,setter:Ol},$[hc]={size:12,setter:Ol},$[gc]={size:16,setter:Ol},$[_c]={size:4,setter:kl},$[vc]={size:8,setter:kl},$[yc]={size:12,setter:kl},$[bc]={size:16,setter:kl},$[Vc]={size:4,setter:Al},$[Hc]={size:8,setter:Al},$[Uc]={size:12,setter:Al},$[Wc]={size:16,setter:Al},$[xc]={size:4,setter:kl},$[Sc]={size:8,setter:kl},$[Cc]={size:12,setter:kl},$[wc]={size:16,setter:kl},$[Tc]={size:4,setter:jl,count:2},$[Ec]={size:9,setter:jl,count:3},$[Dc]={size:16,setter:jl,count:4};var Ml=/ERROR:\s*\d+:(\d+)/gi;function Nl(e,t=``,n=0){let r=[...t.matchAll(Ml)],i=new Map(r.map((e,n)=>{let i=parseInt(e[1]),a=r[n+1],o=a?a.index:t.length,s=t.substring(e.index,o);return[i-1,s]}));return e.split(`
`).map((e,t)=>{let r=i.get(t);return`${t+1+n}: ${e}${r?`\n\n^^^ ${r}`:``}`}).join(`
`)}var Pl=/^[ \t]*\n/;function Fl(e){let t=0;return Pl.test(e)&&(t=1,e=e.replace(Pl,``)),{lineOffset:t,shaderSource:e}}function Il(e,t){return e.errorCallback(t),e.callback&&setTimeout(()=>{e.callback(`${t}\n${e.errors.join(`
`)}`)}),null}function Ll(e,t,n,r){if(r||=Ys,!e.getShaderParameter(n,ec)){let i=e.getShaderInfoLog(n),{lineOffset:a,shaderSource:o}=Fl(e.getShaderSource(n)),s=`${Nl(o,i,a)}\nError compiling ${Ps(e,t)}: ${i}`;return r(s),s}return``}function Rl(e,t,n){let r,i,a;if(typeof t==`function`&&(n=t,t=void 0),typeof e==`function`)n=e,e=void 0;else if(e&&!Array.isArray(e)){let t=e;n=t.errorCallback,e=t.attribLocations,r=t.transformFeedbackVaryings,i=t.transformFeedbackMode,a=t.callback}let o=n||Ys,s=[],c={errorCallback(e,...t){s.push(e),o(e,...t)},transformFeedbackVaryings:r,transformFeedbackMode:i,callback:a,errors:s};{let n={};Array.isArray(e)?e.forEach(function(e,r){n[e]=t?t[r]:r}):n=e||{},c.attribLocations=n}return c}var zl=[`VERTEX_SHADER`,`FRAGMENT_SHADER`];function Bl(e,t){if(t.indexOf(`frag`)>=0)return nc;if(t.indexOf(`vert`)>=0)return rc}function Vl(e,t,n){let r=e.getAttachedShaders(t);for(let t of r)n.has(t)||e.deleteShader(t);e.deleteProgram(t)}var Hl=(e=0)=>new Promise(t=>setTimeout(t,e));function Ul(e,t,n){let r=e.createProgram(),{attribLocations:i,transformFeedbackVaryings:a,transformFeedbackMode:o}=Rl(n);for(let n=0;n<t.length;++n){let i=t[n];if(typeof i==`string`){let t=Xs(i),r=t?t.text:i,a=e[zl[n]];t&&t.type&&(a=Bl(e,t.type)||a),i=e.createShader(a),e.shaderSource(i,Fl(r).shaderSource),e.compileShader(i)}e.attachShader(r,i)}Object.entries(i).forEach(([t,n])=>e.bindAttribLocation(r,n,t));{let t=a;t&&(t.attribs&&(t=t.attribs),Array.isArray(t)||(t=Object.keys(t)),e.transformFeedbackVaryings(r,t,o||ic))}return e.linkProgram(r),r}function Wl(e,t,n,r,i){let a=Rl(n,r,i),o=new Set(t),s=Ul(e,t,a);function c(e,t){let n=Kl(e,t,a.errorCallback);return n&&Vl(e,t,o),n}if(a.callback){Gl(e,s).then(()=>{let t=c(e,s);a.callback(t,t?void 0:s)});return}return c(e,s)?void 0:s}async function Gl(e,t){let n=e.getExtension(`KHR_parallel_shader_compile`),r=n?(e,t)=>e.getProgramParameter(t,n.COMPLETION_STATUS_KHR):()=>!0,i=0;do await Hl(i),i=1e3/60;while(!r(e,t))}function Kl(e,t,n){if(n||=Ys,!e.getProgramParameter(t,tc)){let r=e.getProgramInfoLog(t);return n(`Error in program linking: ${r}`),`${r}\n${e.getAttachedShaders(t).map(t=>Ll(e,e.getShaderParameter(t,e.SHADER_TYPE),t,n)).filter(e=>e).join(`
`)}`}}function ql(e,t,n,r,i){return Wl(e,t,n,r,i)}function Jl(e){let t=e.name;return t.startsWith(`gl_`)||t.startsWith(`webgl_`)}var Yl=/(\.|\[|]|\w+)/g,Xl=e=>e>=`0`&&e<=`9`;function Zl(e,t,n,r){let i=e.split(Yl).filter(e=>e!==``),a=0,o=``;for(;;){let e=i[a++];o+=e;let s=Xl(e[0]),c=s?parseInt(e):e;if(s&&(o+=i[a++]),a===i.length){n[c]=t;break}{let e=i[a++],t=e===`[`,s=n[c]||(t?[]:{});n[c]=s,n=s,r[o]=r[o]||function(e){return function(t){tu(e,t)}}(s),o+=e}}}function Ql(e,t){let n=0;function r(t,r,i){let a=r.name.endsWith(`[0]`),o=r.type,s=X[o];if(!s)throw Error(`unknown type: 0x${o.toString(16)}`);let c;if(s.bindPoint){let t=n;n+=r.size,c=a?s.arraySetter(e,o,t,i,r.size):s.setter(e,o,t,i,r.size)}else c=s.arraySetter&&a?s.arraySetter(e,i):s.setter(e,i);return c.location=i,c}let i={},a={},o=e.getProgramParameter(t,ac);for(let n=0;n<o;++n){let o=e.getActiveUniform(t,n);if(Jl(o))continue;let s=o.name;s.endsWith(`[0]`)&&(s=s.substr(0,s.length-3));let c=e.getUniformLocation(t,o.name);if(c){let e=r(t,o,c);i[s]=e,Zl(s,e,a,i)}}return i}function $l(e,t){let n={},r=e.getProgramParameter(t,sc);for(let i=0;i<r;++i){let r=e.getTransformFeedbackVarying(t,i);n[r.name]={index:i,type:r.type,size:r.size}}return n}function eu(e,t){let n=e.getProgramParameter(t,ac),r=[],i=[];for(let a=0;a<n;++a){i.push(a),r.push({});let n=e.getActiveUniform(t,a);r[a].name=n.name}[[`UNIFORM_TYPE`,`type`],[`UNIFORM_SIZE`,`size`],[`UNIFORM_BLOCK_INDEX`,`blockNdx`],[`UNIFORM_OFFSET`,`offset`]].forEach(function(n){let a=n[0],o=n[1];e.getActiveUniforms(t,i,e[a]).forEach(function(e,t){r[t][o]=e})});let a={},o=e.getProgramParameter(t,cc);for(let n=0;n<o;++n){let r=e.getActiveUniformBlockName(t,n),i={index:e.getUniformBlockIndex(t,r),usedByVertexShader:e.getActiveUniformBlockParameter(t,n,lc),usedByFragmentShader:e.getActiveUniformBlockParameter(t,n,uc),size:e.getActiveUniformBlockParameter(t,n,dc),uniformIndices:e.getActiveUniformBlockParameter(t,n,fc)};i.used=i.usedByVertexShader||i.usedByFragmentShader,a[r]=i}return{blockSpecs:a,uniformData:r}}function tu(e,t){for(let n in t){let r=e[n];typeof r==`function`?r(t[n]):tu(e[n],t[n])}}function nu(e,...t){let n=e.uniformSetters||e,r=t.length;for(let e=0;e<r;++e){let r=t[e];if(Array.isArray(r)){let e=r.length;for(let t=0;t<e;++t)nu(n,r[t])}else for(let e in r){let t=n[e];t&&t(r[e])}}}function ru(e,t){let n={},r=e.getProgramParameter(t,oc);for(let i=0;i<r;++i){let r=e.getActiveAttrib(t,i);if(Jl(r))continue;let a=e.getAttribLocation(t,r.name),o=$[r.type],s=o.setter(e,a,o);s.location=a,n[r.name]=s}return n}function iu(e,t){for(let n in t){let r=e[n];r&&r(t[n])}}function au(e,t,n){n.vertexArrayObject?e.bindVertexArray(n.vertexArrayObject):(iu(t.attribSetters||t,n.attribs),n.indices&&e.bindBuffer($s,n.indices))}function ou(e,t){let n=Ql(e,t),r=ru(e,t),i={program:t,uniformSetters:n,attribSetters:r,uniformLocations:Object.fromEntries(Object.entries(n).map(([e,t])=>[e,t.location])),attribLocations:Object.fromEntries(Object.entries(r).map(([e,t])=>[e,t.location]))};return Ns(e)&&(i.uniformBlockSpec=eu(e,t),i.transformFeedbackInfo=$l(e,t)),i}var su=/\s|{|}|;/;function cu(e,t,n,r,i){let a=Rl(n,r,i),o=[];if(t=t.map(function(e){if(!su.test(e)){let t=Xs(e);if(t)e=t.text;else{let t=`no element with id: ${e}`;a.errorCallback(t),o.push(t)}}return e}),o.length)return Il(a,``);let s=a.callback;s&&(a.callback=(t,n)=>{s(t,t?void 0:ou(e,n))});let c=ql(e,t,a);return c?ou(e,c):null}var lu=4,uu=5123;function du(e,t,n,r,i,a){n=n===void 0?lu:n;let o=t.indices,s=t.elementType,c=r===void 0?t.numElements:r;i=i===void 0?0:i,s||o?a===void 0?e.drawElements(n,c,s===void 0?uu:t.elementType,i):e.drawElementsInstanced(n,c,s===void 0?uu:t.elementType,i,a):a===void 0?e.drawArrays(n,i,c):e.drawArraysInstanced(n,i,c,a)}var fu=6402,pu=33190,mu=36012,hu=35056,gu=36013,_u=32854,vu=32855,yu=36194,bu=33189,xu=6401,Su=36168,Cu=34041,wu=36096,Tu=36128,Eu=33306,Du={};Du[Cu]=Eu,Du[xu]=Tu,Du[Su]=Tu,Du[fu]=wu,Du[bu]=wu,Du[pu]=wu,Du[mu]=wu,Du[hu]=Eu,Du[gu]=Eu;var Ou={};Ou[_u]=!0,Ou[vu]=!0,Ou[yu]=!0,Ou[Cu]=!0,Ou[bu]=!0,Ou[xu]=!0,Ou[Su]=!0;var ku={addExtensionsToContext:!0},Au=/^(.*?)_/;function ju(e,t){Ps(e,0);let n=e.getExtension(t);if(n){let r={},i=Au.exec(t)[1],a=`_`+i;for(let t in n){let o=n[t],s=typeof o==`function`,c=s?i:a,l=t;t.endsWith(c)&&(l=t.substring(0,t.length-c.length)),e[l]===void 0?s?e[l]=function(e){return function(){return e.apply(n,arguments)}}(o):(e[l]=o,r[l]=o):!s&&e[l]!==o&&Xo(l,e[l],o,t)}r.constructor={name:n.constructor.name},Ps(r,0)}return n}var Mu=`ANGLE_instanced_arrays.EXT_blend_minmax.EXT_color_buffer_float.EXT_color_buffer_half_float.EXT_disjoint_timer_query.EXT_disjoint_timer_query_webgl2.EXT_frag_depth.EXT_sRGB.EXT_shader_texture_lod.EXT_texture_compression_bptc.EXT_texture_compression_rgtc.EXT_texture_filter_anisotropic.OES_element_index_uint.OES_standard_derivatives.OES_texture_float.OES_texture_float_linear.OES_texture_half_float.OES_texture_half_float_linear.OES_vertex_array_object.WEBGL_color_buffer_float.WEBGL_compressed_texture_atc.WEBGL_compressed_texture_etc1.WEBGL_compressed_texture_etc.WEBGL_compressed_texture_pvrtc.WEBGL_compressed_texture_s3tc.WEBGL_compressed_texture_s3tc_srgb.WEBGL_depth_texture.WEBGL_draw_buffers`.split(`.`);function Nu(e){for(let t=0;t<Mu.length;++t)ju(e,Mu[t])}function Pu(e,t){let n=[`webgl2`,`webgl`,`experimental-webgl`],r=null;for(let i=0;i<n.length;++i)if(r=e.getContext(n[i],t),r){ku.addExtensionsToContext&&Nu(r);break}return r}function Fu(e,t){return Pu(e,t)}function Iu(e,t){t||=1,t=Math.max(0,t);let n=e.clientWidth*t|0,r=e.clientHeight*t|0;return e.width!==n||e.height!==r?(e.width=n,e.height=r,!0):!1}var Lu=150,Ru=`
attribute float a_index;
uniform vec2 u_resolution;
uniform float u_time;
varying float v_color_type;
varying float v_intensity_base;

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float seed = a_index * 123.456;
  
  float speed_rand = hash2(vec2(seed, 1.1));
  float size_rand = hash2(vec2(seed, 2.2));
  float y_rand = hash2(vec2(seed, 3.3));
  float x_rand = hash2(vec2(seed, 4.4));
  float blink_rand = hash2(vec2(seed, 5.5));
  float color_type_rand = hash2(vec2(seed, 6.6));

  float aspect = u_resolution.x / u_resolution.y;
  float speed = 0.008 + speed_rand * 0.024;
  float size = 0.0006 + 0.0032 * pow(size_rand, 3.8);
  
  float y = -0.45 + y_rand * 0.9;
  
  float margin = 0.05;
  float width = aspect + margin * 2.0;
  float x = fract(x_rand + u_time * speed);
  x = x * width - (aspect * 0.5 + margin);
  
  float wave = sin(u_time * 0.3 + y_rand * 6.283) * 0.005;
  
  float ndc_x = x / (aspect * 0.5);
  float ndc_y = (y + wave) / 0.5;
  
  gl_Position = vec4(ndc_x, ndc_y, 0.0, 1.0);
  
  // Point size in pixels. 
  float pointSize = size * u_resolution.y * 3.5;
  gl_PointSize = max(2.0, pointSize);
  
  float blink = 0.3 + 0.7 * sin(u_time * (1.0 + blink_rand * 2.5) + x_rand * 6.283);
  v_intensity_base = blink;
  v_color_type = color_type_rand;
}
`,zu=`
precision mediump float;
uniform vec3 u_particle_color;
uniform vec3 u_particle_accent_color;

varying float v_color_type;
varying float v_intensity_base;

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float dist = length(pc);
  
  float alpha = smoothstep(0.5, 0.1, dist) * v_intensity_base;
  if (alpha < 0.01) discard;
  
  vec3 baseColor = v_color_type > 0.90 ? u_particle_accent_color : u_particle_color;
  
  // Pre-multiplied alpha blending
  gl_FragColor = vec4(baseColor * alpha, alpha);
}
`,Bu=({theme:e,isDaylight:t,paused:n=!1,blendMs:r=0,blendProgress:i})=>{let a=(0,I.useRef)(null),o=(0,I.useRef)(null),s=(0,I.useRef)(0),c=(0,I.useRef)(null),[l,u]=$e([e.primaryColor,e.accentColor],r,i),d=x(l)||(t?{r:0,g:0,b:0}:{r:255,g:255,b:255}),f=[d.r/255,d.g/255,d.b/255],p=x(u)||d,m=[p.r/255,p.g/255,p.b/255],h=t?[1,1,1]:[0,0,0],g=(0,I.useRef)(n),_=(0,I.useRef)(f),v=(0,I.useRef)(m),y=(0,I.useRef)(h);return g.current=n,_.current=f,v.current=m,y.current=h,(0,I.useEffect)(()=>{let e=a.current;if(!e)return;let t=Fu(e,{alpha:!1,depth:!1,antialias:!1});if(!t)return;let n=cu(t,[Ru,zu],e=>{console.error(`SoraBackground twgl program error:`,e)});if(!n)return;let r=new Float32Array(Lu);for(let e=0;e<Lu;e++)r[e]=e;let i=Ms(t,{a_index:{numComponents:1,data:r}}),l=null,u=()=>{o.current===null&&(o.current=requestAnimationFrame(d))},d=r=>{if(o.current=null,!g.current&&l!==null){let e=(r-l)/1e3;s.current+=e}l=g.current?null:r,Iu(e),t.viewport(0,0,t.canvas.width,t.canvas.height);let a=y.current;t.clearColor(a[0],a[1],a[2],1),t.clear(t.COLOR_BUFFER_BIT),t.enable(t.BLEND),t.blendFunc(t.ONE,t.ONE_MINUS_SRC_ALPHA);let c={u_resolution:[t.canvas.width,t.canvas.height],u_time:s.current,u_particle_color:_.current,u_particle_accent_color:v.current};t.useProgram(n.program),au(t,n,i),nu(n,c),du(t,i,t.POINTS),g.current||u()},f=new ResizeObserver(u);return f.observe(e),c.current=u,u(),()=>{c.current=null,f.disconnect(),o.current!==null&&(cancelAnimationFrame(o.current),o.current=null),t.deleteProgram(n.program),i.attribs&&i.attribs.a_index&&i.attribs.a_index.buffer&&t.deleteBuffer(i.attribs.a_index.buffer)}},[]),(0,I.useEffect)(()=>{c.current?.()},[n,t,l,u]),(0,L.jsx)(`canvas`,{ref:a,className:`absolute inset-0 w-full h-full block pointer-events-none`,style:{width:`100%`,height:`100%`,willChange:`transform`,transform:`translateZ(0)`}})},Vu={id:`bg-sora`,titleKey:`options.soraBackgroundSettings`},Hu=({t:e,tuning:t,onTuningChange:n})=>(0,L.jsx)(M,{def:Vu,children:(0,L.jsx)(F,{label:e(`options.soraBlank`),note:e(`options.soraBlankDesc`),checked:t.blank,onChange:e=>n?.({blank:e})})}),Uu=t({default:()=>Wu});y();var Wu=ve({mode:`sora`,order:50,labelKey:`options.visualizerBackgroundModeSora`,labelFallback:`Sora`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`path`,{d:`M12 5.5l1.2 2.9 2.9 1.2-2.9 1.2L12 13.7l-1.2-2.9-2.9-1.2 2.9-1.2z`}),(0,L.jsx)(`path`,{d:`M5.5 16.5h.01M18 15.5h.01M7 7h.01`,strokeWidth:`2.2`,opacity:`0.5`})]}),command:{title:`Background: Sora`,description:`Switch background to Sora (starry sky) layout`,keywords:[`sora`,`starry sky`,`star`,`星空`,`空`,`背景切换到 空`,`背景切换到空`,`背景切换到Sora`,`背景切换到星空`]},render:({config:e,theme:t,isDaylight:n,paused:r,staticMode:i,blendMs:a,blendProgress:o})=>(0,L.jsx)(`div`,{className:`absolute inset-0 z-0`,style:{backgroundColor:n?`#ffffff`:`#000000`},children:!e?.sora?.tuning?.blank&&(0,L.jsx)(Bu,{theme:t,isDaylight:n,paused:r||i,blendMs:a,blendProgress:o})}),renderSettingsPanel:({config:e,actions:t,t:n})=>(0,L.jsx)(Hu,{t:n,tuning:e?.sora?.tuning??g,onTuningChange:t?.sora?.onTuningChange}),renderQuickControls:({config:e,actions:t,t:r})=>{let i=e?.sora?.tuning??g;return(0,L.jsx)(ce,{active:i.blank,label:r(`options.soraBlank`),onToggle:()=>t?.sora?.onTuningChange?.({blank:!i.blank}),children:(0,L.jsx)(n,{size:14})})},resetSettings:e=>e?.sora?.onResetTuning?.()}),Gu=({urlBackgroundList:e=[],urlBackgroundSelectedId:t=null})=>{let n=(0,I.useMemo)(()=>me(e.find(e=>e.id===t)),[e,t]),r=(0,I.useRef)(null),[i,a]=(0,I.useState)(!1);return(0,I.useEffect)(()=>{a(!1);let e=r.current;if(!e)return;let t=e.getBoundingClientRect();if(t.width>0&&t.height>0){a(!0);return}let n=new ResizeObserver(e=>{for(let t of e){let{width:e,height:r}=t.contentRect;e>0&&r>0&&(a(!0),n.disconnect())}});return n.observe(e),()=>{n.disconnect()}},[n]),n?.url?(0,L.jsxs)(`div`,{ref:r,className:`absolute inset-0 z-0 overflow-hidden`,children:[i&&(0,L.jsx)(`iframe`,{src:n.url,title:n.note||n.url,className:`w-full h-full border-0`,style:{pointerEvents:`none`},sandbox:`allow-scripts`,allowFullScreen:!0},n.url),(0,L.jsx)(`div`,{className:`absolute inset-0`,style:{background:`linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.35))`,pointerEvents:`none`}})]}):null},Ku={id:`bg-url`,titleKey:`options.urlBackgroundSettings`},qu=()=>`url-bg-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,Ju=({t:e,urlBackgroundList:t=[],urlBackgroundSelectedId:n=null,onAddUrlBackgroundItem:r,onUpdateUrlBackgroundItem:o,onDeleteUrlBackgroundItem:s,onSetUrlBackgroundSelectedId:c})=>{let[l,u]=(0,I.useState)(!1),[d,f]=(0,I.useState)(null),[m,h]=(0,I.useState)(``),[g,_]=(0,I.useState)(``),v=(0,I.useCallback)(()=>{h(``),_(``),u(!1),f(null)},[]),y=(0,I.useCallback)(()=>{let e=pe(m);if(!e)return;let t={id:qu(),url:e,note:g.trim()||e};r?.(t),c?.(t.id),v()},[m,g,r,c,v]),b=(0,I.useCallback)(e=>{u(!1),f(e.id),h(e.url),_(e.note)},[]),x=(0,I.useCallback)(()=>{if(!d)return;let e=pe(m);e&&(o?.(d,{url:e,note:g.trim()||e}),v())},[d,m,g,o,v]),S=t=>(0,L.jsx)(j,{below:(0,L.jsxs)(`div`,{className:`flex flex-col gap-2 [&>input]:w-full`,children:[(0,L.jsx)(ne,{type:`url`,value:m,onChange:h,placeholder:`https://example.com`}),(0,L.jsx)(ne,{value:g,onChange:_,placeholder:e(`options.urlBackgroundNotePlaceholder`)}),(0,L.jsxs)(`div`,{className:`flex justify-end gap-2`,children:[(0,L.jsx)(se,{onClick:v,children:e(`ui.cancel`)}),(0,L.jsx)(se,{variant:`primary`,onClick:t,disabled:!m.trim(),children:e(`options.save`)})]})]})});return(0,L.jsxs)(M,{def:Ku,foot:e(`options.urlBackgroundSettingsDesc`),children:[t.map(t=>d===t.id?(0,L.jsx)(I.Fragment,{children:S(x)},t.id):(0,L.jsxs)(j,{label:(0,L.jsxs)(`button`,{type:`button`,role:`radio`,"aria-checked":t.id===n,onClick:()=>c?.(t.id),className:`flex w-full min-w-0 items-center gap-2.5 rounded text-left`,children:[(0,L.jsx)(`span`,{"aria-hidden":!0,className:`st-t-fast h-4 w-4 shrink-0 rounded-full transition-shadow ${t.id===n?`shadow-[inset_0_0_0_5px_var(--st-accent)]`:`shadow-[inset_0_0_0_1.5px_var(--st-t3)]`}`}),(0,L.jsxs)(`span`,{className:`min-w-0`,children:[(0,L.jsx)(`span`,{className:`block truncate`,children:t.note}),(0,L.jsx)(`span`,{className:`block truncate text-xs leading-[18px] text-[color:var(--st-t2)]`,children:t.url})]})]}),children:[(0,L.jsx)(se,{icon:a,tip:e(`options.urlBackgroundEdit`),onClick:()=>b(t)}),(0,L.jsx)(se,{icon:i,tip:e(`options.urlBackgroundDelete`),onClick:()=>s?.(t.id)})]},t.id)),l?S(y):(0,L.jsx)(j,{label:t.length===0?(0,L.jsx)(de,{children:e(`options.urlBackgroundEmpty`)}):void 0,children:(0,L.jsx)(se,{icon:p,onClick:()=>{f(null),h(``),_(``),u(!0)},children:e(`options.urlBackgroundAdd`)})})]})},Yu=t({default:()=>Xu}),Xu=ve({mode:`url`,order:40,labelKey:`options.visualizerBackgroundModeUrl`,labelFallback:`Embed`,glyph:(0,L.jsxs)(L.Fragment,{children:[(0,L.jsx)(`rect`,{x:`3.5`,y:`5`,width:`17`,height:`14`,rx:`2`}),(0,L.jsx)(`path`,{d:`M3.5 9.5h17`,opacity:`0.55`})]}),command:{title:`Background: Embedded Background`,description:`Switch background to embedded webpage mode`,keywords:[`embedded background`,`embed background`,`background embed`,`background url`,`url background`,`url`,`webpage`,`嵌入背景`,`网页背景`,`背景切换到 嵌入背景`,`背景切换到嵌入背景`]},render:({config:e})=>(0,L.jsx)(Gu,{urlBackgroundList:e?.url?.items,urlBackgroundSelectedId:e?.url?.selectedId}),renderSettingsPanel:({config:e,actions:t,...n})=>(0,L.jsx)(Ju,{...n,urlBackgroundList:e?.url?.items,urlBackgroundSelectedId:e?.url?.selectedId,onAddUrlBackgroundItem:t?.url?.onAdd,onUpdateUrlBackgroundItem:t?.url?.onUpdate,onDeleteUrlBackgroundItem:t?.url?.onDelete,onSetUrlBackgroundSelectedId:t?.url?.onSelect})}),{entries:Zu,byMode:Qu}=(e=>{let t=Object.entries(e).map(([e,t])=>{if(!t.default)throw Error(`[VisualizerBackgroundRegistry] Missing default export in ${e}`);return t.default}),n={};return t.forEach(e=>{if(n[e.mode])throw Error(`[VisualizerBackgroundRegistry] Duplicate background mode "${e.mode}"`);n[e.mode]=e}),{entries:[...t].sort((e,t)=>e.order-t.order),byMode:n}})(Object.assign({"./common/entry.tsx":Yt,"./latent/entry.tsx":mi,"./monet/entry.tsx":Wa,"./nomand/entry.tsx":To,"./sora/entry.tsx":Uu,"./url/entry.tsx":Yu}));fe(`VisualizerBackgroundRegistry`,Zu.map(e=>e.mode),ue);var $u=e=>typeof e==`string`&&!!Qu[e],ed=e=>Qu[e]??Qu.latent,td=(e,t)=>{let n=ed(e),r=t(n.labelKey);return!r||r===n.labelKey?n.labelFallback:r},nd=e=>!Qu[e.mode]&&(Qu[e.mode]=e,Zu.push(e),Zu.sort((e,t)=>e.order-t.order),!0),rd=e=>{if(!Qu[e])return!1;delete Qu[e];let t=Zu.findIndex(t=>t.mode===e);return t>=0&&Zu.splice(t,1),!0},id=e=>typeof e!=`number`||!Number.isFinite(e)?null:Math.round(Math.min(900,Math.max(100,e))/10)*10,ad=(e,t)=>id(e?.fontWeight)??t,od=`"獅尾四季春加糖SC"`,sd={sans:`"Inter", "Noto Sans CJK SC", "Noto Sans JP", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif`,serif:`${od}, "Iowan Old Style", "Noto Serif CJK SC", "Noto Serif JP", "Source Han Serif SC", "Songti SC", "STSong", "Georgia", serif`,mono:`"IBM Plex Mono", "Sarasa Mono SC", "Noto Sans Mono CJK SC", "Noto Sans Mono", "SFMono-Regular", Consolas, monospace`},cd={sans:`system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Helvetica Neue", Arial, "Noto Sans CJK SC", "Source Han Sans SC", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans JP", "Source Han Sans JP", "Hiragino Sans", "Yu Gothic", Meiryo, sans-serif`,serif:`${od}, "Folia Noto Serif SC", "Iowan Old Style", Georgia, "Times New Roman", "Noto Serif CJK SC", "Source Han Serif SC", "Songti SC", "STSong", "SimSun", "Noto Serif JP", "Source Han Serif JP", "Yu Mincho", "MS PMincho", serif`,mono:`Consolas, "IBM Plex Mono", "SFMono-Regular", Menlo, Monaco, "Sarasa Mono SC", "Noto Sans Mono CJK SC", "SimHei", "DengXian", "Microsoft YaHei UI", "Microsoft YaHei", "Noto Sans Mono CJK JP", "MS Gothic", monospace`},ld=new Set([`serif`,`sans-serif`,`monospace`,`cursive`,`fantasy`,`system-ui`,`ui-serif`,`ui-sans-serif`,`ui-monospace`,`ui-rounded`,`emoji`,`math`,`fangsong`]),ud=e=>`"${e.replace(/["\\]/g,`\\$&`)}"`,dd=e=>e.trim().replace(/^['"]|['"]$/g,``).trim(),fd=e=>{let t=dd(e);return t?ld.has(t.toLowerCase())?t:ud(t):null},pd=e=>{let t=new Set,n=[];return e?.forEach(e=>{let r=dd(e??``);if(!r)return;let i=r.toLocaleLowerCase();t.has(i)||(t.add(i),n.push(r))}),n},md=e=>{let t=[...e.fontFamily?[e.fontFamily]:[],...e.fontFamilyStack??[]];return t.length===0?[]:pd(t).map(fd).filter(e=>!!e)},hd=e=>sd[e]??sd.sans,gd=e=>{let t=hd(e.fontStyle),n=md(e);return n.length===0?t:`${n.join(`, `)}, ${t}`},_d=e=>{let t=cd[e.fontStyle]??cd.sans,n=md(e);return n.length===0?t:`${n.join(`, `)}, ${t}`},vd=typeof window>`u`?new URLSearchParams:new URLSearchParams(window.location.search),yd=typeof window<`u`&&(vd.get(`obs`)===`1`||window.location.pathname===`/obs`),bd=vd.get(`obsSource`),xd=!yd&&vd.get(`remote`)===`1`,Sd=typeof window<`u`&&!yd&&!xd,Cd=e=>{let t=new Set;return{subscribe:e=>(t.add(e),()=>t.delete(e)),notify:()=>{t.forEach(t=>{try{t()}catch(t){console.warn(`[Folium] ${e} failed`,t)}})}}},wd=e=>{let t=(0,I.useRef)(null);return t.current??=Cd(e),t.current},Td=(e,t)=>{let n=(0,I.useRef)(!1);(0,I.useEffect)(()=>{if(!n.current){n.current=!0;return}e.notify()},t)},Ed=/^[a-z0-9][a-z0-9-]*$/,Dd=(e,t)=>`${e}:${t}`,Od=(e,t={})=>{let n=new Map,r=Cd(`${e} listener`),i=Object.freeze([]),a=()=>{i=Object.freeze(Array.from(n.values())),r.notify()},o=r=>{let i=n.get(r);if(i){n.delete(r);try{t.onRemove?.(i)}catch(t){console.warn(`[Folium] ${e}: removing ${r} failed`,t)}a()}};return{name:e,register:(r,i)=>{if(!i||typeof i!=`object`||typeof i.id!=`string`||!Ed.test(i.id))throw Error(`[Folium] ${e}.register: id must match /^[a-z0-9][a-z0-9-]*$/`);let s=Dd(r,i.id);if(n.has(s))throw Error(`[Folium] ${e}.register: duplicate id "${s}"`);let c=t.validate?t.validate(i,{modId:r,id:s}):i,l={id:s,modId:r,name:i.id,def:c};n.set(s,l);try{t.onAdd?.(l)}catch(e){throw n.delete(s),e}return a(),Object.freeze({id:s,unregister:()=>{n.get(s)===l&&o(s)}})},unregister:o,unregisterAll:e=>{Array.from(n.values()).filter(t=>t.modId===e).forEach(e=>o(e.id))},get:e=>n.get(e)??null,list:()=>i,subscribe:r.subscribe}},kd=e=>(0,I.useSyncExternalStore)(e.subscribe,e.list,e.list);h();var Ad=[`player.stage.back`,`player.stage.front`,`app.overlay`],jd=Od(`stageLayers`,{validate:e=>{if(!Ad.includes(e.slot))throw Error(`stageLayers.register: slot must be one of ${Ad.join(`, `)}`);if(typeof e.mount!=`function`)throw Error(`stageLayers.register: mount must be a function`);return e}}),Md=I.lazy(()=>m(()=>import(`./stageLayerView-CsIhvVjH.js`),__vite__mapDeps([4,1,3,5,6,2,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30]))),Nd=e=>kd(jd).some(t=>t.def.slot===e.slot)?(0,L.jsx)(I.Suspense,{fallback:null,children:(0,L.jsx)(Md,{...e})}):null,Pd=Object.freeze({top:0,right:0,bottom:0,left:0}),Fd=(e,t)=>{if(![e.left,e.top,e.width,e.height].every(Number.isFinite))return null;let n=Math.max(t.left,e.left),r=Math.max(t.top,e.top),i=Math.min(t.left+t.width,e.left+e.width),a=Math.min(t.top+t.height,e.top+e.height);return i<=n||a<=r?null:Object.freeze({left:n,top:r,width:i-n,height:a-r})},Id=(e,t,n=Pd)=>{let r=new Map;for(let n of t){let t=Fd(n.rect,e);if(!t)continue;let i=r.get(n.key),a=i?{left:Math.min(i.rect.left,t.left),top:Math.min(i.rect.top,t.top),width:Math.max(i.rect.left+i.rect.width,t.left+t.width)-Math.min(i.rect.left,t.left),height:Math.max(i.rect.top+i.rect.height,t.top+t.height)-Math.min(i.rect.top,t.top)}:t;r.set(n.key,Object.freeze({role:n.role,kind:n.kind,rect:Object.freeze(a)}))}let i=(e,t)=>Number.isFinite(e)?Math.min(Math.max(0,e),t):0,a=i(n.top,e.height),o=i(n.left,e.width);return Object.freeze({bounds:Object.freeze({left:e.left,top:e.top,width:e.width,height:e.height}),insets:Object.freeze({top:a,left:o,right:i(n.right,e.width-o),bottom:i(n.bottom,e.height-a)}),obstacles:Object.freeze([...r.entries()].sort(([e],[t])=>e.localeCompare(t)).map(([,e])=>e))})},Ld=(e,t)=>{if(e===t)return!0;if(!e||!t||e.obstacles.length!==t.obstacles.length)return!1;let n=(e,t)=>e.left===t.left&&e.top===t.top&&e.width===t.width&&e.height===t.height;return n(e.bounds,t.bounds)&&[`top`,`right`,`bottom`,`left`].every(n=>e.insets[n]===t.insets[n])&&e.obstacles.every((e,r)=>{let i=t.obstacles[r];return e.role===i.role&&e.kind===i.kind&&n(e.rect,i.rect)})},Rd=(()=>{let e=null,t=null,n=null,r=Pd,i,a,o=new Map,s=new Set,c=()=>{let i=e?.isConnected?e.getBoundingClientRect():null,a=i&&i.width>0&&i.height>0?Id(i,[...o.values()].flatMap(({read:e})=>{let t=e(i);return t?[t]:[]}),r):null;return t===e&&Ld(n,a)?!1:(t=e,n=a,!0)},l=()=>{if(c())for(let e of[...s])try{e()}catch(e){console.warn(`[Folium] layout subscriber failed`,e)}},u=()=>{s.size&&i===void 0&&(e||n!==null)&&(i=setTimeout(()=>{i=void 0,l()},80))},d=()=>{if(a?.disconnect(),window.removeEventListener(`resize`,u),window.removeEventListener(`scroll`,u,!0),!e||!s.size){a=void 0;return}!a&&typeof ResizeObserver<`u`&&(a=new ResizeObserver(u)),a?.observe(e);for(let e of o.values())e.element&&a?.observe(e.element);window.addEventListener(`resize`,u),window.addEventListener(`scroll`,u,!0)};return{source:{get:()=>!e?.isConnected||!s.size?null:t===e?n:null,subscribe:e=>{s.add(e),s.size===1&&d(),u();let r=!1;return()=>{r||(r=!0,s.delete(e),s.size||(clearTimeout(i),i=void 0,d(),n=null,t=null))}}},invalidate:u,registerRoot:(t,n=Pd)=>(e=t,r={...n},d(),u(),()=>{e===t&&(e=null),d(),u()}),register:(e,t)=>{let n=Symbol();return o.set(n,{element:e,read:t}),d(),u(),()=>{o.delete(n),d(),u()}}}})();export{z as $,Nr as A,Or as B,$u as C,Mr as D,Pr as E,Gr as F,hr as G,zr as H,Wr as I,or as J,fr as K,Lr as L,kr as M,Br as N,Ur as O,Vr as P,Ln as Q,Ir as R,ed as S,Zi as T,Kr as U,jr as V,dr as W,ir as X,sr as Y,Hn as Z,ad as _,Oe as _t,Od as a,Ft as at,nd as b,Ve as bt,wd as c,Nt as ct,yd as d,Xe as dt,mn as et,xd as f,Ye as ft,gd as g,ke as gt,id as h,Ge as ht,jd as i,zt as it,Rr as j,Hr as k,Td as l,It as lt,pd as m,Ke as mt,Pd as n,pn as nt,Dd as o,Mt as ot,bd as p,We as pt,cr as q,Nd as r,sn as rt,kd as s,jt as st,Rd as t,cn as tt,Sd as u,Pt as ut,_d as v,Ue as vt,rd as w,td as x,Re as xt,Zu as y,He as yt,Fr as z};