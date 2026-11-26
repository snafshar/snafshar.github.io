import {editHomePhotos} from "/press/home-photo-editor.mjs";
import {createProof,el,runMarkup} from "/press/proof.mjs";
import {layoutHistory} from "/press/layout-history.mjs";
import {WIDTH,HEIGHT,clamp} from "/press/composition.mjs";

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const state=JSON.parse($("#studio-data").textContent);
async function write(path,body,opts={}){
  const {headers,...rest}=opts, response=await fetch("/cntrladmin/api/"+path,{method:"POST",headers:{"X-Journal-Write":"studio",...headers},body,...rest});
  const result=await response.json().catch(()=>({error:"Your session may have expired. Open the dashboard in another tab to sign in."}));
  if(!response.ok||result.error)throw new Error(result.error||"The request did not finish.");
  return result;
}
const send=(path,value)=>write(path,JSON.stringify(value),{headers:{"Content-Type":"application/json"}});
function report(error){const s=$("#status")||$("#upload-status");if(s){s.textContent=error.message||String(error);s.classList.add("error");s.setAttribute("role","alert");}}
function mediaDimensions(file){
  return new Promise((resolve,reject)=>{
    const url=URL.createObjectURL(file),video=file.type.startsWith("video"),node=video?document.createElement("video"):new Image();
    function finish(fn,v){node.onload=node.onerror=node.onloadedmetadata=null;clearTimeout(timer);if(video){node.removeAttribute("src");node.load();}URL.revokeObjectURL(url);fn(v);}
    const timer=setTimeout(()=>finish(reject,new Error("This browser could not read "+file.name+".")),20000);
    const ready=()=>finish(resolve,[video?node.videoWidth:node.naturalWidth,video?node.videoHeight:node.naturalHeight]);
    if(video){node.preload="metadata";node.onloadedmetadata=ready;}else node.onload=ready;
    node.onerror=()=>finish(reject,new Error("Could not read "+file.name+". Try JPEG, PNG, WebP, MP4, or WebM."));node.src=url;
  });
}
function wireUploads(added,options={}){
  const input=options.input||$("#files");if(!input)return;let busy=false;
  async function ingest(files){
    if(busy)return;
    const status=options.status||$("#upload-status");
    if(options.available && files.length>options.available()){status.textContent="This selection would exceed 20 homepage photos.";input.value="";return;}
    busy=true;input.disabled=true;status.classList.remove("error");let done=0;const errors=[];
    try{for(const file of files){
      try{if(options.available&&(!file.type.startsWith("image/")||!options.available()))throw new Error("Choose a photograph within the 20-photo limit.");if(!["image/jpeg","image/png","image/webp","video/mp4","video/webm"].includes(file.type))throw new Error("Unsupported type: "+file.name);
        const max=file.type.startsWith("video")?80:16;if(file.size>max*1024*1024)throw new Error(file.name+" exceeds "+max+" MB.");
        status.textContent="Uploading "+file.name+"…";const [width,height]=await mediaDimensions(file);
        const q=new URLSearchParams({name:file.name,width:String(width),height:String(height)});
        const a=await write("media?"+q,file,{headers:{"Content-Type":file.type,"X-File-Size":String(file.size)}});
        state.assets.unshift(a);added(a);done++;
      }catch(e){errors.push(e.message);}}
      status.textContent=(done?done+" "+(done===1?"item":"items")+" added. ":"")+errors.join(" ");status.classList.toggle("error",!!errors.length);
    }finally{input.value="";busy=false;input.disabled=options.available?options.available()<=0:false;}
  }
  input.addEventListener("change",()=>ingest([...input.files]));
  const zone=options.zone||(state.view==="gallery"?$("#main"):$(".asset-panel"));
  zone.addEventListener("dragover",e=>{if(e.dataTransfer.types.includes("Files")){e.preventDefault();zone.classList.add("file-hover");}});
  zone.addEventListener("dragleave",e=>{if(!zone.contains(e.relatedTarget))zone.classList.remove("file-hover");});
  zone.addEventListener("drop",e=>{if(e.dataTransfer.files.length){e.preventDefault();zone.classList.remove("file-hover");ingest([...e.dataTransfer.files]);}});
}
function renderGallery(arm,proof,place){
  const wrap=$("#library-items");if(!wrap)return;
  const fragment=document.createDocumentFragment();
  for(const a of state.assets){
    const item=el(arm?"button":"figure","library-item");if(arm){item.type="button";item.classList.add("placeable");item.draggable=false;item.dataset.asset=a.id;item.title="Place "+a.name;item.setAttribute("aria-pressed","false");}
    const img=el(a.kind==="video"?"video":"img");
    if(a.kind==="video"){img.muted=true;img.playsInline=true;img.preload="metadata";img.src=a.url+"#t=0.01";if(!arm)img.controls=true;}
    else {img.src=a.thumb;img.alt=a.alt||a.name;img.loading="lazy";}
    img.draggable=false;const name=el(arm?"span":"figcaption","asset-name",a.name);
    item.append(img,name);if(a.kind==="video")item.append(el("span","asset-kind","Video"));
    if(arm){
      let skipClick=false;
      item.addEventListener("click",()=>{if(!skipClick)arm(a.id);});
      const grip=el("span","touch-grip","⠿");grip.title="Drag to sheet";grip.setAttribute("aria-hidden","true");item.append(grip);
      item.addEventListener("pointerdown",e=>{
        if(e.button!==0 || (e.pointerType==="touch" && e.target!==grip))return;
        const startX=e.clientX,startY=e.clientY;let ghost=null;
        item.setPointerCapture(e.pointerId);
        function move(ev){
          if(ev.pointerId!==e.pointerId)return;
          if(!ghost && Math.hypot(ev.clientX-startX,ev.clientY-startY)<5)return;
          if(!ghost){ghost=el("div","touch-ghost",a.name);document.body.append(ghost);}
          ghost.style.left=(ev.clientX+10)+"px";ghost.style.top=(ev.clientY+10)+"px";
          const p=proof.point(ev.clientX,ev.clientY);
          for(const sheet of document.querySelectorAll(".press-sheet"))sheet.classList.toggle("drop-target",Number(sheet.dataset.page)===p?.page);
          if(ev.clientY<60)window.scrollBy(0,-15);if(ev.clientY>innerHeight-60)window.scrollBy(0,15);
        }
        function finish(ev){
          if(ev.pointerId!==e.pointerId)return;
          item.removeEventListener("pointermove",move);item.removeEventListener("pointerup",finish);item.removeEventListener("pointercancel",finish);
          for(const sheet of document.querySelectorAll(".drop-target"))sheet.classList.remove("drop-target");
          if(!ghost)return;
          ghost.remove();skipClick=true;setTimeout(()=>{skipClick=false;},0);
          if(ev.type==="pointerup"){const p=proof.point(ev.clientX,ev.clientY);if(p)place(a.id,p);}
        }
        item.addEventListener("pointermove",move);item.addEventListener("pointerup",finish);item.addEventListener("pointercancel",finish);
      });
    }
    fragment.append(item);
  }
  wrap.replaceChildren(fragment);
}
if(state.view==="gallery"){renderGallery();wireUploads(()=>renderGallery());}
if(state.view==="contacts"){
  $("#contacts").onsubmit=async e=>{e.preventDefault();const form=e.currentTarget,b=form.querySelector("button");b.disabled=true;
    try{const v=await send("contacts",Object.fromEntries(new FormData(form)));for(const [key,url] of Object.entries(v))form.elements.namedItem(key).value=url;$("#status").classList.remove("error");$("#status").textContent="Contact links saved.";}
    catch(err){report(err);}finally{b.disabled=false;}};
}
if(state.view==="about"){
  const form=$("#about"),button=form.querySelector("button"),status=$("#status");
  let revision=state.revision,epoch=0,dirty=false,saving=false;
  form.addEventListener("input",()=>{dirty=true;epoch++;status.textContent="Unsaved changes";});
  form.onsubmit=async event=>{
    event.preventDefault();if(saving)return;
    const captured=epoch;
    saving=true;button.disabled=true;status.classList.remove("error");status.textContent="Publishing…";
    try{
      const value=await send("about",{body:form.elements.namedItem("body").value,revision});
      revision=value.revision;
      if(captured===epoch)dirty=false;
      status.textContent=dirty?"Biography published. You have unsaved changes.":"Biography published.";
    }catch(error){report(error);}
    finally{saving=false;button.disabled=false;}
  };
  window.addEventListener("beforeunload",event=>{if(dirty||saving){event.preventDefault();event.returnValue="";}});
}
if(state.view==="stories"||state.view==="trash"){
  document.addEventListener("click",async event=>{
    const button=event.target.closest("button[data-entry-action]");if(!button||button.disabled)return;
    const action=button.dataset.entryAction,title=button.dataset.entryTitle;
    const prompt=action==="purge"?`Permanently delete “${title}”? Its saved text and layout cannot be restored. Gallery files will remain.`:action==="delete"?`Move “${title}” to Trash? It will be unpublished. You can restore the saved item as a draft.`:action==="unpublish"?`Unpublish “${title}” and keep its saved draft?`:null;
    if(prompt&&!confirm(prompt))return;
    const controls=$$("button[data-entry-action]");controls.forEach(node=>node.disabled=true);
    try{await send("entry-action",{id:button.dataset.entryId,revision:Number(button.dataset.entryRevision),action,...(action==="purge"?{confirm:"DELETE FOREVER"}:{})});location.reload();}
    catch(error){report(error);controls.forEach(node=>node.disabled=false);}
  });
}
if(state.view==="themes")import("/press/edition-desk.mjs").then(module=>module.editionStudio(state,send));
if(state.view==="email-delivery")import("/press/edition-desk.mjs").then(module=>module.emailDelivery(send));
if(state.view==="editor")startEditor();
if(state.view==="page-settings")import("/press/page-settings-desk.mjs").then(module=>module.startPageSettings(state,send));
if(state.view==="site-settings")import("/admin/settings.mjs").then(module=>module.startSiteSettings(state));
if(state.view==="statistics")import("/admin/statistics.mjs").then(module=>module.initStatistics(state));

function readParagraphs(root){
  const paras=[];let runs=[],kind="p";
  function flush(force=false){if(runs.length||force)paras.push({kind,runs});runs=[];}
  function append(text,flags){
    if(!text)return;const r=runs.at(-1);
    if(r&&!!r.bold===!!flags.bold&&!!r.italic===!!flags.italic&&!!r.underline===!!flags.underline)r.text+=text;
    else runs.push({text,...flags});
  }
  function walk(n,flags={}){
    if(n.nodeType===Node.TEXT_NODE){append(n.textContent.replace(/\u00a0/g," "),flags);return;}
    if(n.nodeType!==Node.ELEMENT_NODE)return;
    if(["SCRIPT","STYLE","IMG","VIDEO","IFRAME","OBJECT"].includes(n.tagName))return;
    if(n.tagName==="BR"){flush(true);return;}
    const block=["P","DIV","H1","H2","H3","BLOCKQUOTE","LI"].includes(n.tagName),prior=kind;
    if(block){flush();kind=n.tagName==="BLOCKQUOTE"?"quote":n.tagName.startsWith("H")?"h2":"p";}
    const next={...flags};if(["B","STRONG"].includes(n.tagName)||["bold","700"].includes(n.style.fontWeight))next.bold=true;
    if(["I","EM"].includes(n.tagName)||n.style.fontStyle==="italic")next.italic=true;
    if(n.tagName==="U"||n.style.textDecoration.includes("underline"))next.underline=true;
    if(block&&n.childNodes.length===0)flush(true);else for(const child of n.childNodes)walk(child,next);
    if(block){flush();kind=prior;}
  }
  for(const child of root.childNodes)walk(child);flush();return paras;
}
function startEditor(){
  const rec=state.record;
  const now=new Date(), localDate=new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,10);
  let doc=rec?structuredClone(rec.draft):{id:"",title:"",deck:"",category:"Journal",location:"",date:localDate,cover:"",coverCaption:"",coverAlt:"",order:0,columns:2,align:"justify",pages:1,body:[],frames:[]};
  doc.section??=state.section||"journal";
  const news=doc.section==="news";
  if(news&&!rec)doc.category="News";
  doc.coverOverlay ??= "";
  doc.coverOverlayAt ??= "bottom";
  const layouts = layoutHistory(doc);
  let revision=rec?.revision||0,published=rec?.published||false,selected="",armed="",dirty=false,epoch=0,saving=false,currentMode="write",savedRange=null;
  const body=$("#body-editor"),props=$("#properties"),root=$("#studio-proof"),hint=$("#layout-hint"),notice=$("#status");
  for(const p of doc.body){const n=el(p.kind==="quote"?"blockquote":p.kind);runMarkup(n,p.runs);if(!p.runs.length)n.append(el("br"));body.append(n);}
  let homePhotos;
  function changed(){homePhotos?.refresh();dirty=true;epoch++;$("#save-state").textContent="Unsaved changes";notice.textContent="";notice.classList.remove("error");}
  const update=()=>proof.update(doc,state.assets,selected);
  function setSelection(id){selected=id;props.hidden=!id;if(id){const f=doc.frames.find(p=>p.id===id);if(f){for(const n of $$("[data-frame-field]"))n.value=f[n.dataset.frameField];syncNumbers(f);}}}
  function syncNumbers(f){for(const n of $$("[data-geometry]")){if(n!==document.activeElement)n.value=f[n.dataset.geometry]+(n.dataset.geometry==="page"?1:0);}}
  function move(id,patch,group=null){const f=doc.frames.find(p=>p.id===id);if(!f)return;Object.assign(f,patch);f.w=clamp(Math.round(f.w),64,WIDTH);f.h=clamp(Math.round(f.h),40,760);f.x=clamp(Math.round(f.x),0,WIDTH-f.w);f.y=clamp(Math.round(f.y),0,HEIGHT-f.h);if(id===selected)syncNumbers(f);layoutChange(group);}
  function place(id,pos){
    const a=state.assets.find(a=>a.id===id);if(!a)return;const w=clamp(Math.round((WIDTH-(doc.columns-1)*30)/doc.columns*1.12),150,420),h=clamp(Math.round(w*a.height/a.width),75,385);
    const f={id:"f-"+crypto.randomUUID(),asset:id,page:pos.page,x:clamp(Math.round(pos.x-w/2),0,WIDTH-w),y:clamp(Math.round(pos.y-h/2),0,HEIGHT-h),w,h,alt:a.alt||"",caption:"",overlay:"",overlayAt:"bottom"};
    doc.frames.push(f);armed="";root.classList.remove("armed");$$(".library-item[aria-pressed]").forEach(n=>n.setAttribute("aria-pressed","false"));setSelection(f.id);layoutChange();
    hint.textContent="Drag the frame to move it. Drag its corner to resize it.";
  }
  const inline = $("#inline-edit"), inlineBody = $("#inline-body");
  let inlineIndex=0, originalBlock=null, insertedBlocks=0;
  function editParagraph(index, rect) {
    if (!doc.body[index] || inline.open) return;
    inlineIndex=index; originalBlock=structuredClone(doc.body[index]); insertedBlocks=1;
    const n=el(originalBlock.kind==="quote"?"blockquote":originalBlock.kind);
    runMarkup(n,originalBlock.runs); inlineBody.replaceChildren(n);
    inline.style.left=clamp(rect.left,12,Math.max(12,innerWidth-Math.min(420,innerWidth-24)-12))+"px";
    inline.style.top=clamp(rect.bottom+6,12,Math.max(12,innerHeight-270))+"px";
    inline.showModal(); inlineBody.focus();
    const range=document.createRange();range.selectNodeContents(n);range.collapse(false);
    const selection=getSelection();selection.removeAllRanges();selection.addRange(range);
  }
  function replaceBlocks(blocks) {
    const next=doc.body.slice();
    next.splice(inlineIndex,insertedBlocks,...blocks); insertedBlocks=blocks.length; doc.body=next;
    const nodes=next.map(p=>{const n=el(p.kind==="quote"?"blockquote":p.kind);runMarkup(n,p.runs);if(!p.runs.length)n.append(el("br"));return n;});
    body.replaceChildren(...nodes);changed();update();
  }
  inlineBody.addEventListener("input",()=>{
    const blocks=readParagraphs(inlineBody);
    replaceBlocks(blocks.length?blocks:[{kind:originalBlock.kind,runs:[]}]);
  });
  inlineBody.addEventListener("paste",e=>{
    e.preventDefault();document.execCommand("insertText",false,e.clipboardData.getData("text/plain"));
  });
  function discardInline(){if(originalBlock)replaceBlocks([originalBlock]);}
  $("#cancel-inline").onclick=discardInline;
  inline.addEventListener("keydown",e=>{
    if(e.key==="Escape"){e.preventDefault();discardInline();inline.close();}
    if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();inline.close();}
  });
  inline.addEventListener("close",()=>{originalBlock=null;});
  const proof=createProof(root,{editing:true,onPlace:place,onSelect:setSelection,onMove:move,onGestureEnd:()=>layouts.end(),onParagraph:editParagraph});
  function historyButtons() {
    $("#undo-layout").disabled = !layouts.canUndo;
    $("#redo-layout").disabled = !layouts.canRedo;
  }
  function layoutChange(group=null) {
    layouts.record(group); historyButtons(); changed(); update();
  }
  function stepLayout(redo) {
    if (!(redo ? layouts.redo() : layouts.undo())) return;
    $("#columns").value = String(doc.columns);
    $("#align").value = doc.align;
    body.style.textAlign = doc.align;
    setSelection(doc.frames.some(f=>f.id===selected) ? selected : "");
    historyButtons(); changed(); update();
  }
  $("#undo-layout").onclick=()=>stepLayout(false);
  $("#redo-layout").onclick=()=>stepLayout(true);
  root.addEventListener("keydown",e=>{
    if ((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="z") {
      e.preventDefault();stepLayout(e.shiftKey);
    }
  });
  function arm(id){armed=armed===id?"":id;root.classList.toggle("armed",!!armed);$$(".library-item[data-asset]").forEach(n=>n.setAttribute("aria-pressed",String(n.dataset.asset===armed)));
    hint.textContent=armed?"Tap or click a place on the sheet. Press Escape to cancel.":"Drag gallery media onto the sheet.";}
  root.addEventListener("pointerdown",e=>{if(!armed)return;const p=proof.point(e.clientX,e.clientY);if(p){e.preventDefault();e.stopImmediatePropagation();place(armed,p);}},true);
  root.addEventListener("keydown",e=>{if(armed&&e.key==="Enter"){e.preventDefault();place(armed,{page:Number(e.target.closest(".press-sheet")?.dataset.page||0),x:WIDTH/2,y:155});}});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&armed)arm(armed);if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="s"){e.preventDefault();persist("draft");}});
  function mode(value){
    currentMode=value;const write=value==="write";$("#write-panel").hidden=!write;$("#layout-side").hidden=write;
    $(".layout-area").classList.toggle("with-side",!write);root.classList.toggle("arranging",!write);
    $$("[data-mode]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===value)));
    if(write&&armed)arm(armed);hint.textContent=write?"Double-click a line to edit its paragraph on the sheet.":"Drag media onto the sheet. Drag a corner to resize. Hold Shift to keep proportions.";
    proof.dimensions();
  }
  $$("[data-mode]").forEach(b=>b.onclick=()=>mode(b.dataset.mode));
  function coverOptions(){const field=$("#cover");field.replaceChildren(new Option("No cover media",""));for(const a of state.assets)field.append(new Option(a.name,a.id));field.value=doc.cover;}
  coverOptions();
  for(const key of ["title","deck","category","location","date","order","cover","coverCaption","coverAlt","coverOverlay","coverOverlayAt","columns","align"]){
    const n=$("#"+key);n.value=String(doc[key]);
    n.addEventListener("input",()=>{doc[key]=["order","columns"].includes(key)?Number(n.value):n.value;if(key==="cover"&&!doc.coverAlt){doc.coverAlt=state.assets.find(a=>a.id===doc.cover)?.alt||"";$("#coverAlt").value=doc.coverAlt;}if(key==="columns"||key==="align"){body.style.textAlign=doc.align;layoutChange();}else changed();});
  }
  body.style.textAlign=doc.align;
  function bodyChange(){doc.body=readParagraphs(body);changed();update();}
  body.addEventListener("input",bodyChange);
  body.addEventListener("paste",e=>{e.preventDefault();document.execCommand("insertText",false,e.clipboardData.getData("text/plain"));});
  body.addEventListener("drop",e=>e.preventDefault());
  body.addEventListener("focus",()=>document.execCommand("defaultParagraphSeparator",false,"p"));
  document.addEventListener("selectionchange",()=>{const s=getSelection();if(s.rangeCount&&body.contains(s.anchorNode)&&body.contains(s.focusNode)){savedRange=s.getRangeAt(0).cloneRange();for(const b of $$("[data-command]")){if(["bold","italic","underline"].includes(b.dataset.command))b.setAttribute("aria-pressed",String(document.queryCommandState(b.dataset.command)));}}});
  function restore(){body.focus();if(savedRange&&body.contains(savedRange.commonAncestorContainer)){const s=getSelection();s.removeAllRanges();s.addRange(savedRange);}}
  for(const b of $$("[data-command]")){b.onmousedown=e=>e.preventDefault();b.onclick=()=>{restore();document.execCommand(b.dataset.command,false);bodyChange();};}
  $("#block-style").onchange=e=>{restore();document.execCommand("formatBlock",false,e.target.value);bodyChange();};
  const homePanel=$("#home-photos");
  if(homePanel){
    homePhotos=editHomePhotos(doc,state.assets,changed);
    wireUploads(a=>{homePhotos.add(a.id);galleryView();},{input:homePanel.querySelector("[data-upload-home]"),zone:homePanel,status:homePanel.querySelector("[role=status]"),available:homePhotos.available});
  }
  function galleryView(){renderGallery(arm,proof,place);coverOptions();homePhotos?.refresh();}
  galleryView();wireUploads(galleryView);
  for(const n of $$("[data-frame-field]")){
    n.oninput=()=>{if(selected)move(selected,{[n.dataset.frameField]:n.value},selected+"-"+n.dataset.frameField);};
    n.onblur=()=>layouts.end();
  }
  for(const field of $$("[data-geometry]")){
    const key=field.dataset.geometry;
    function apply(final){
      const frame=doc.frames.find(f=>f.id===selected);
      if(!frame)return;
      const offset=key==="page"?1:0;
      let value=field.valueAsNumber;
      if(!Number.isSafeInteger(value)||value<Number(field.min)||value>Number(field.max)){
        if(!final)return;
        value=Number.isFinite(value)?clamp(Math.round(value),Number(field.min),Number(field.max)):frame[key]+offset;
      }
      if(frame[key]!==value-offset)move(frame.id,{[key]:value-offset},frame.id+"-"+key);
      if(final)field.value=String(frame[key]+offset);
    }
    field.oninput=()=>apply(false);
    field.onchange=()=>apply(true);
    field.onblur=()=>{apply(true);layouts.end();};
  }
  $("#remove-frame").onclick=()=>{if(!selected)return;doc.frames=doc.frames.filter(f=>f.id!==selected);setSelection("");layoutChange();};
  $("#cover-from-frame").onclick=()=>{const f=doc.frames.find(f=>f.id===selected);if(!f)return;doc.cover=f.asset;doc.coverAlt=f.alt;doc.coverCaption=f.caption;doc.coverOverlay=f.overlay;doc.coverOverlayAt=f.overlayAt;for(const key of ["cover","coverAlt","coverCaption","coverOverlay","coverOverlayAt"])$("#"+key).value=doc[key];changed();hint.textContent="Story cover updated.";};
  $("#add-sheet").onclick=()=>{const count=Math.max(doc.pages,proof.getPages().length);if(count>=300){report(new Error("The editor supports up to 300 manually added sheets."));return;}doc.pages=count+1;layoutChange();requestAnimationFrame(()=>root.querySelector(".proof-page:last-child")?.scrollIntoView({block:"start"}));};
  async function persist(action){
    if(saving)return;
    doc.title=doc.title.trim();if(!doc.title){$("#title").focus();report(new Error("Give the story a headline first."));return;}
    if(action==="unpublish"&&!confirm(news?"Unpublish this news update and keep its draft?":"Unpublish this post and keep its draft?"))return;
    if(!doc.id){const slug=doc.title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,64)||"story";doc.id=slug+"-"+crypto.randomUUID().slice(0,8);}
    const captured=epoch;saving=true;for(const n of [$("#save-draft"),$("#publish"),$("#unpublish"),$("#delete-entry")])n.disabled=true;
    $("#save-state").textContent="Saving…";
    try{
      const result=await send("entry",{doc,revision,action});revision=result.revision;published=result.published;
      if(captured===epoch)dirty=false;
      $("#save-state").textContent=dirty?"Unsaved changes":action==="publish"?"Published":published&&result.pending?"Draft saved · live story unchanged":"Draft saved";
      notice.classList.remove("error");notice.textContent=action==="publish"?(news?"News update published.":"Story published."):action==="unpublish"?(news?"News update unpublished.":"Story unpublished."):"Draft saved.";
      history.replaceState(null,"","/cntrladmin/edit/"+doc.id);const preview=$("#preview-link");preview.href="/cntrladmin/preview/"+doc.id;preview.hidden=false;
      const live=$("#public-link");live.href=(news?"/news/":"/story/")+doc.id;live.hidden=!published;$("#unpublish").hidden=!published;$("#delete-entry").hidden=false;
    }catch(err){$("#save-state").textContent=dirty?"Unsaved changes":"Save failed";report(err);}
    finally{saving=false;for(const n of [$("#save-draft"),$("#publish"),$("#unpublish"),$("#delete-entry")])n.disabled=false;}
  }
  $("#save-draft").onclick=()=>persist("draft");$("#publish").onclick=()=>persist("publish");$("#unpublish").onclick=()=>persist("unpublish");
  $("#delete-entry").onclick=async()=>{
    if(saving||!doc.id)return;
    if(!confirm(`Move “${doc.title}” to Trash? It will be unpublished. ${dirty?"Unsaved changes will not be kept. ":""}You can restore the saved version as a draft.`))return;
    saving=true;const controls=[$("#save-draft"),$("#publish"),$("#unpublish"),$("#delete-entry")];controls.forEach(node=>node.disabled=true);
    try{await send("entry-action",{id:doc.id,revision,action:"delete"});dirty=false;saving=false;const target=news?"/cntrladmin/news":"/cntrladmin";location.assign(window.MyPhotoStories?.routeURL(target)||target);}
    catch(error){report(error);saving=false;controls.forEach(node=>node.disabled=false);}
  };
  window.addEventListener("beforeunload",e=>{if(dirty||saving){e.preventDefault();e.returnValue="";}});
  mode(currentMode);update();
}
