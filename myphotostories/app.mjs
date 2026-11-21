import {backend,pagesOrigin,publicBase,adminBase,isAdmin,sourceURL,routeURL,assetURL} from "./routes.mjs";

const nativeFetch=window.fetch.bind(window);
const authKey="myphotostories-owner-session",visitKey="myphotostories-visit-identifiers";
let current=sourceURL(location.href),media={},session=readSession();
function readSession(){try{const v=JSON.parse(sessionStorage.getItem(authKey));return v&&v.expires*1000>Date.now()?v:null;}catch{return null;}}
function visitState(){try{const v=JSON.parse(localStorage.getItem(visitKey));return v?.until>Date.now()?v.value:"";}catch{return "";}}
function saveVisitState(value){try{if(value===".")localStorage.removeItem(visitKey);else localStorage.setItem(visitKey,JSON.stringify({value,until:Date.now()+180*86400000}));}catch{}}
function relayURL(path){const u=new URL("/github/relay",backend);u.searchParams.set("path",path);return u;}
async function relay(path, options={}) {
  const headers=new Headers(options.headers);
  if(session)headers.set("Authorization","Bearer "+session.token);
  const state=visitState();if(state)headers.set("X-Journal-Visitor",state);
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
  if(node.tagName==="LINK") {node.setAttribute("href",assetURL(href,media));return;}
  if(!["A","AREA"].includes(node.tagName))return;
  const u=new URL(href,backend);
  if(!["http:","https:"].includes(u.protocol) || (u.origin!==backend && u.origin!==pagesOrigin))return;
  if(u.pathname==="/signout-with-chatgpt") {node.dataset.signOut="true";node.setAttribute("href",pagesOrigin+publicBase);return;}
  node.setAttribute("href",routeURL(href,location.href));
  if(node.getAttribute("target")==="_top")node.removeAttribute("target");
}
window.MyPhotoStories={routeURL:value=>routeURL(value,location.href),sourceURL:()=>current.href,sourcePath:()=>current.pathname};
window.fetch=async function(input,options={}) {
  const value=typeof input==="string"?input:input instanceof URL?input.href:input.url;
  const url=new URL(value,location.href);
  const internal=(url.origin===location.origin||url.origin===backend) && (url.pathname.startsWith("/cntrladmin/api/")||["/visit-event","/visit-policy"].includes(url.pathname));
  if(!internal)return nativeFetch(input,options);
  const response=await relay(url.pathname+url.search,options);
  if(response.status===401 && url.pathname.startsWith("/cntrladmin/api/")) reconnectNotice();
  if(url.pathname==="/cntrladmin/api/site-preview"&&response.ok) {
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
  for(const node of doc.head.querySelectorAll('link[rel="stylesheet"],style,meta[name="theme-color"]'))document.head.append(document.importNode(node,true));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:["href"]});
  for(const script of scripts)await import(script);
  const preview=document.querySelector("#site-preview");
  if(preview){const r=await relay("/cntrladmin/site-preview");if(r.ok){const p=await r.json();preview.srcdoc=rewriteDocument(p.html,p.media).documentElement.outerHTML;}}
  if(location.hash){try{document.querySelector(location.hash)?.scrollIntoView();}catch{}}
}
function notice(text) {
  const root=document.querySelector("#pages-root"),p=document.createElement("p");p.textContent=text;p.setAttribute("role","alert");root.append(p);
}
function loginScreen(message="Sign in to manage your journal.") {
  document.body.className="";
  const root=document.querySelector("#pages-root");root.replaceChildren();
  const main=document.createElement("main");main.className="pages-login";
  const heading=document.createElement("h1");heading.textContent="MyPhotoStories";
  const info=document.createElement("p");info.textContent=message;
  const button=document.createElement("button");button.type="button";button.textContent="Sign in with ChatGPT";
  const status=document.createElement("p");status.setAttribute("role","status");
  button.onclick=()=>connect(button,status);
  main.append(heading,info,button,status);root.append(main);
}
function reconnectNotice() {
  if(document.querySelector("#owner-reconnect"))return;
  const box=document.createElement("section");box.id="owner-reconnect";box.className="owner-reconnect";
  const text=document.createElement("p");text.textContent="Your owner session expired. Reconnect to continue saving your current work.";
  const button=document.createElement("button");button.type="button";button.textContent="Reconnect";
  const status=document.createElement("p");status.setAttribute("role","status");
  button.onclick=()=>connect(button,status,()=>{box.remove();notice("Connected. You can save your current work again.");});
  box.append(text,button,status);document.body.append(box);
}
async function connect(button,status,connected=()=>location.reload()) {
  const popup=window.open("about:blank","myphotostories-owner","popup,width=650,height=740");
  if(!popup){status.textContent="Allow the sign-in window for this site, then try again.";return;}
  const verifier=Array.from(crypto.getRandomValues(new Uint8Array(32)),n=>n.toString(16).padStart(2,"0")).join("");
  const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(verifier));
  const challenge=Array.from(new Uint8Array(bytes),n=>n.toString(16).padStart(2,"0")).join("");
  popup.location.href=backend+"/github/login?challenge="+challenge;
  button.disabled=true;status.textContent="Complete sign-in and choose Connect dashboard in the new window.";
  const until=Date.now()+5*60000;
  try {
    while(Date.now()<until) {
      const response=await nativeFetch(backend+"/github/exchange",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({verifier}),credentials:"omit",redirect:"error"});
      if(!response.ok)throw new Error("Could not connect your owner session. Please try again.");
      if(response.status===200) {
        session=await response.json();sessionStorage.setItem(authKey,JSON.stringify(session));
        try{popup.close();}catch{}
        connected();return;
      }
      await new Promise(resolve=>setTimeout(resolve,2000));
    }
    status.textContent="The sign-in request expired. Please try again.";
  }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
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
  if(isAdmin(current.pathname)&&!session){loginScreen();return;}
  const response=await relay(current.pathname+current.search);
  if(response.status===401&&isAdmin(current.pathname)){sessionStorage.removeItem(authKey);session=null;loginScreen("Your session expired. Sign in again to continue.");return;}
  const payload=await response.json();
  if(payload.html)await mount(payload);else throw new Error(payload.error||"The page could not load.");
}
start().catch(error=>notice(error.message+" Reload to try again."));
