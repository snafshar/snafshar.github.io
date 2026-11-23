import {backend,pagesOrigin,publicBase,adminBase,isAdmin,sourceURL,routeURL,assetURL} from "./routes.mjs";

const nativeFetch=window.fetch.bind(window);
const authKey="myphotostories-owner-session",visitKey="myphotostories-visit-identifiers";
let setupToken=isAdmin(sourceURL(location.href).pathname)?/^#setup=([a-f0-9]{64})$/.exec(location.hash)?.[1]:null;
// The one-use setup credential stays in memory, outside requests and history.
if(setupToken)history.replaceState(null,"",location.pathname+location.search);
let current=sourceURL(location.href),media={},session=readSession();
function readSession(){try{const v=JSON.parse(sessionStorage.getItem(authKey));return v&&v.expires*1000>Date.now()?v:null;}catch{return null;}}
function visitState(){try{const v=JSON.parse(localStorage.getItem(visitKey));return v?.until>Date.now()?v.value:"";}catch{return "";}}
function saveVisitState(value){try{if(value===".")localStorage.removeItem(visitKey);else localStorage.setItem(visitKey,JSON.stringify({value,until:Date.now()+180*86400000}));}catch{}}
function relayURL(path){const u=new URL("/github/relay",backend);u.searchParams.set("path",path);return u;}
async function relay(path, options={}) {
  const headers=new Headers(options.headers);
  if(session&&!path.startsWith("/notifications"))headers.set("Authorization","Bearer "+session.token);
  const state=visitState();if(state&&!path.startsWith("/notifications"))headers.set("X-Journal-Visitor",state);
  const response=await nativeFetch(relayURL(path),{...options,headers,credentials:"omit",redirect:"error",cache:"no-store"});
  const visits=response.headers.get("X-Journal-Visitor");if(visits!==null)saveVisitState(visits);
  return response;
}
function rewriteDocument(html, protectedMedia={}) {
  const doc=new DOMParser().parseFromString(html,"text/html");
  doc.querySelectorAll("base,meta[http-equiv=refresh]").forEach(n=>n.remove());
  for(const node of doc.querySelectorAll("[href]"))rewriteLink(node);
  for(const node of doc.querySelectorAll("[src]")) {
    if(node.tagName==="IFRAME")node.removeAttribute("src");
    else node.setAttribute("src",assetURL(node.getAttribute("src"),protectedMedia));
  }
  for(const node of doc.querySelectorAll("[srcset]"))node.setAttribute("srcset",node.getAttribute("srcset").split(",").map(item=>{const [src,...size]=item.trim().split(/\s+/);return [assetURL(src,protectedMedia),...size].join(" ");}).join(", "));
  for(const node of doc.querySelectorAll('script[type="application/json"]')) {
    try {
      const data=JSON.parse(node.textContent);
      for(const a of data.assets||[]) {a.url=assetURL(a.url,protectedMedia);a.thumb=assetURL(a.thumb,protectedMedia);}
      node.textContent=JSON.stringify(data).replace(/</g,"\\u003c");
    }catch{/* Other data scripts are kept as supplied by the renderer. */}
  }
  return doc;
}
function rewriteLink(node) {
  const href=node.getAttribute("href");if(!href)return;
  if(node.tagName==="LINK") {const mapped=assetURL(href,media);if(mapped!==href)node.setAttribute("href",mapped);return;}
  if(!["A","AREA"].includes(node.tagName))return;
  const u=new URL(href,backend);
  if(!["http:","https:"].includes(u.protocol) || (u.origin!==backend && u.origin!==pagesOrigin))return;
  if(u.pathname==="/signout-with-chatgpt") {node.dataset.signOut="true";if(href!==pagesOrigin+publicBase)node.setAttribute("href",pagesOrigin+publicBase);return;}
  const mapped=routeURL(href,location.href);
  if(mapped!==href)node.setAttribute("href",mapped);
  if(node.getAttribute("target")==="_top")node.removeAttribute("target");
}
window.MyPhotoStories={routeURL:value=>routeURL(value,location.href),sourceURL:()=>current.href,sourcePath:()=>current.pathname};
window.fetch=async function(input,options={}) {
  const value=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  const url=new URL(value,location.href);
  const internal=(url.origin===location.origin||url.origin===backend) && (url.pathname.startsWith("/cntrladmin/api/")||url.pathname.startsWith("/notifications/api/")||["/visit-event","/visit-policy"].includes(url.pathname));
  if(!internal)return nativeFetch(input,options);
  const response=await relay(url.pathname+url.search,options);
  if(response.status===401 && url.pathname.startsWith("/cntrladmin/api/")) reconnectNotice();
  if(["/cntrladmin/api/site-preview","/cntrladmin/api/theme-preview"].includes(url.pathname)&&response.ok) {
    const data=await response.json();data.html=rewriteDocument(data.html,media).documentElement.outerHTML;
    return new Response(JSON.stringify(data),{status:response.status,headers:{"Content-Type":"application/json"}});
  }
  return response;
};
const replaceState=history.replaceState.bind(history);
history.replaceState=(state,title,url)=>{
  if(url){const target=new URL(String(url),location.href);if(target.origin===location.origin && isAdmin(target.pathname)){current=new URL(target.pathname+target.search,backend);url=routeURL(target.href);}}
  return replaceState(state,title,url);
};
const observer=new MutationObserver(records=>{
  for(const record of records) {
    if(record.type==="attributes") {if(record.attributeName==="href")rewriteLink(record.target);continue;}
    for(const node of record.addedNodes)if(node.nodeType===1){if(node.matches("[href]"))rewriteLink(node);node.querySelectorAll("[href]").forEach(rewriteLink);}
  }
});
async function mount(payload) {
  media=payload.media||{};
  const doc=rewriteDocument(payload.html,media);
  const scripts=[...doc.querySelectorAll('script[src]')].map(n=>n.getAttribute("src"));
  doc.querySelectorAll('script[src]').forEach(n=>n.remove());
  document.title=doc.title;document.body.className=doc.body.className;
  const root=document.querySelector("#pages-root");root.replaceChildren(...[...doc.body.childNodes].map(n=>document.importNode(n,true)));
  document.head.querySelectorAll('[data-page-meta],meta[name="journal-mobile-canvas"],link[rel="canonical"],meta[property^="og:"],meta[property^="article:"],meta[name="description"],meta[name="twitter:card"],script[type="application/ld+json"]').forEach(node=>node.remove());
  for(const node of doc.head.querySelectorAll('link[rel="stylesheet"],style,meta[name="theme-color"],meta[name="journal-mobile-canvas"],link[rel="canonical"],meta[property^="og:"],meta[property^="article:"],meta[name="description"],meta[name="twitter:card"],script[type="application/ld+json"]')){const copy=document.importNode(node,true);copy.dataset.pageMeta="true";document.head.append(copy);}
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["href"]});
  const version=new URL(import.meta.url).searchParams.get("v");
  for(const script of scripts){const url=new URL(script,location.href);if(version)url.searchParams.set("v",version);await import(url.href);}
  const preview=document.querySelector("#site-preview");
  if(preview){const r=await relay("/cntrladmin/site-preview");if(r.ok){const p=await r.json();preview.srcdoc=rewriteDocument(p.html,p.media).documentElement.outerHTML;}}
  if(location.hash){try{document.querySelector(location.hash)?.scrollIntoView();}catch{}}
}
function notice(text) {
  const root=document.querySelector("#pages-root"),p=document.createElement("p");p.textContent=text;p.setAttribute("role","alert");root.append(p);
}
function authControls(container,connected=()=>location.reload(),setup=false) {
  const form=document.createElement("form");form.method="post";form.className="owner-login-form";
  const field=(text,name,type,autocomplete)=>{
    const label=document.createElement("label"),input=document.createElement("input");
    label.textContent=text;input.name=name;input.type=type;input.autocomplete=autocomplete;input.required=true;
    label.append(input);form.append(label);return input;
  };
  const username=field("Username","username","text","username");username.maxLength=80;username.autocapitalize="none";username.spellcheck=false;
  const password=field("Password","password","password",setup?"new-password":"current-password");password.maxLength=256;
  if(setup){username.value="sina";username.minLength=3;password.minLength=12;}
  const confirm=setup?field("Confirm password","confirm","password","new-password"):null;
  const captcha=document.createElement("fieldset");captcha.className="owner-captcha";
  const legend=document.createElement("legend");legend.textContent="Security verification";
  const image=document.createElement("img");image.alt="Verification image. Enter its six characters below, or use the audio option.";image.width=300;image.height=96;
  const tools=document.createElement("div"),refresh=document.createElement("button"),listen=document.createElement("button");
  refresh.type=listen.type="button";refresh.textContent="New challenge";listen.textContent="Listen instead";
  tools.append(refresh,listen);captcha.append(legend,image,tools);form.append(captcha);
  const answer=field("Verification characters","captchaAnswer","text","off");answer.maxLength=6;answer.required=true;answer.autocapitalize="characters";answer.spellcheck=false;
  const audio=document.createElement("audio");audio.controls=true;audio.hidden=true;captcha.append(audio);
  let challenge=null,audioURL=null;
  const submit=document.createElement("button");submit.type="submit";submit.textContent=setup?"Create my password":"Sign in";
  const status=document.createElement("p");status.setAttribute("role","status");status.setAttribute("aria-live","polite");
  form.append(submit,status);container.append(form);
  async function loadCaptcha(){
    challenge=null;submit.disabled=true;refresh.disabled=true;listen.disabled=true;answer.value="";audio.pause();audio.hidden=true;
    if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}
    try {
      const response=await nativeFetch(backend+"/github/captcha",{credentials:"omit",cache:"no-store",redirect:"error"});
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not load verification.");
      challenge=result;image.src=result.image;
      const bytes=Uint8Array.from(atob(result.audio.split(",")[1]),c=>c.charCodeAt(0));audioURL=URL.createObjectURL(new Blob([bytes],{type:"audio/wav"}));audio.src=audioURL;
      submit.disabled=false;listen.disabled=false;
    }catch(error){status.textContent=error.message;}finally{refresh.disabled=false;}
  }
  refresh.onclick=()=>loadCaptcha();listen.onclick=()=>{audio.hidden=false;audio.play().catch(()=>{status.textContent="Press Play to hear the verification characters.";});};
  loadCaptcha();
  form.onsubmit=async event=>{
    event.preventDefault();
    if(confirm&&password.value!==confirm.value){status.textContent="The passwords do not match.";confirm.focus();return;}
    if(!challenge||challenge.expires*1000<=Date.now()){status.textContent="The challenge expired. Please use the new image.";await loadCaptcha();return;}
    submit.disabled=true;status.textContent=setup?"Creating your password…":"Signing in…";
    try {
      const response=await nativeFetch(backend+"/github/password-"+(setup?"setup":"login"),{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"omit",redirect:"error",cache:"no-store",
        body:JSON.stringify({username:username.value,password:password.value,captchaId:challenge.id,captchaAnswer:answer.value,...(setup?{setupToken}:{})})
      });
      const result=await response.json();if(!response.ok)throw new Error(result.error||"Could not sign in. Please try again.");
      saveSession(result);password.value="";if(confirm)confirm.value="";setupToken=null;connected();
    }catch(error){status.textContent=error.message;await loadCaptcha();}finally{submit.disabled=!challenge;}
  };
}
function saveSession(value){session=value;sessionStorage.setItem(authKey,JSON.stringify(session));}
function loginScreen(message="Sign in to manage your journal.") {
  document.body.className="";
  const root=document.querySelector("#pages-root");root.replaceChildren();
  const main=document.createElement("main");main.className="pages-login";
  const heading=document.createElement("h1");heading.textContent="MyPhotoStories";
  const info=document.createElement("p");info.textContent=setupToken?"Set up your owner login. Choose a password with at least 12 characters.":message;
  main.append(heading,info);authControls(main,()=>location.reload(),!!setupToken);
  if(setupToken){const back=document.createElement("a");back.href=pagesOrigin+adminBase;back.textContent="Already set up? Sign in";main.append(back);}
  root.append(main);
}
function reconnectNotice() {
  if(document.querySelector("#owner-reconnect"))return;
  const box=document.createElement("section");box.id="owner-reconnect";box.className="owner-reconnect";
  const text=document.createElement("p");text.textContent="Your owner session expired. Reconnect to continue saving your current work.";
  box.append(text);authControls(box,()=>{box.remove();notice("Connected. You can save your current work again.");});document.body.append(box);
}
document.addEventListener("click",async event=>{
  const link=event.target.closest("a[href]");if(!link)return;
  if(link.dataset.signOut){event.preventDefault();try{await nativeFetch(backend+"/github/logout",{method:"POST",headers:{Authorization:"Bearer "+session?.token},credentials:"omit"});}finally{sessionStorage.removeItem(authKey);session=null;location.assign(pagesOrigin+adminBase);}return;}
  const target=new URL(link.getAttribute("href"),location.href);
  if(target.pathname==="/cntrladmin/statistics.csv"||target.searchParams.get("route")==="/cntrladmin/statistics.csv") {
    event.preventDefault();const source=target.searchParams.has("route")?sourceURL(target.href):new URL(target.pathname+target.search,backend);
    const r=await relay(source.pathname+source.search);if(!r.ok){notice("Could not export the report. Check your sign-in.");return;}
    const blob=URL.createObjectURL(await r.blob()),save=document.createElement("a");save.href=blob;save.download="myphotostories-visits.csv";save.click();setTimeout(()=>URL.revokeObjectURL(blob),10000);return;
  }
  rewriteLink(link);
  const mapped=new URL(link.href,location.href);
  if(link.target==="_blank" && mapped.origin===location.origin && mapped.pathname===adminBase && session && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
    event.preventDefault();
    const child=window.open(mapped.href,"_blank");
    if(child){try{child.sessionStorage.setItem(authKey,JSON.stringify(session));child.opener=null;}catch{}}
  }
});
document.addEventListener("submit",async event=>{
  const form=event.target;if(form.tagName!=="FORM"||event.defaultPrevented)return;
  if(form.method.toLowerCase()==="dialog")return;
  if(form.method.toLowerCase()!=="post") {
    const target=form.hasAttribute("action")?new URL(form.getAttribute("action"),backend):new URL(current.href);
    const action=routeURL(target.pathname),url=new URL(action);for(const [key,value] of new FormData(form))url.searchParams.set(key,String(value));
    event.preventDefault();location.assign(url.href);return;
  }
  if(current.pathname!=="/contact")return;
  event.preventDefault();const button=form.querySelector('[type="submit"],button');if(button)button.disabled=true;
  try {
    const response=await relay("/contact",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams(new FormData(form))});
    const payload=await response.json();
    if(payload.navigate){location.assign(routeURL(payload.navigate));return;}
    if(payload.html) {
      const doc=new DOMParser().parseFromString(payload.html,"text/html"),fresh=doc.querySelector('form[action^="/contact"]');
      if(fresh){form.replaceChildren(...[...fresh.childNodes].map(n=>document.importNode(n,true)));}
      else notice("Please check the message fields and try again.");
    }else notice(payload.error||"The message could not be sent. Please try again.");
  }catch(error){notice(error.message);}finally{if(button)button.disabled=false;}
});

async function start() {
  if(isAdmin(current.pathname)&&window.top!==window.self)throw new Error("Open the dashboard directly at https://snafshar.github.io/cntrladmin/.");
  if(setupToken){loginScreen();return;}
  if(isAdmin(current.pathname)&&!session){loginScreen();return;}
  const response=await relay(current.pathname+current.search);
  if(response.status===401&&isAdmin(current.pathname)){sessionStorage.removeItem(authKey);session=null;loginScreen("Your session expired. Sign in again to continue.");return;}
  const payload=await response.json();
  if(payload.html)await mount(payload);else throw new Error(payload.error||"The page could not load.");
}
start().catch(error=>notice(error.message+" Reload to try again."));
