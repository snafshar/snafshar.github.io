import {WIDTH,HEIGHT,prepare,paginate,measurer,clamp,anchorParagraph,resizeFrame} from "./composition.mjs";
export const el=(tag,className,text)=>{const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;};
function styles(n,values){Object.assign(n.style,values);}
function positioned(n,x,y,w,h){styles(n,{left:x+"px",top:y+"px",width:w+"px",height:h+"px"});}
export function runMarkup(node,runs){
  for(const run of runs){
    let n=document.createTextNode(run.text);
    for(const [active,tag] of [[run.bold,"strong"],[run.italic,"em"],[run.underline,"u"]])if(active){const t=document.createElement(tag);t.append(n);n=t;}
    node.append(n);
  }
}
export function mediaNode(asset,alt,editing=false){
  const n=el(asset.kind==="video"?"video":"img");
  n.src=asset.url;
  if(n.tagName==="VIDEO"){n.controls=!editing;n.playsInline=true;n.preload="metadata";n.setAttribute("aria-label",alt||asset.name);}
  else {n.alt=alt||asset.alt||"";n.decoding="async";}
  n.draggable=false;return n;
}
export function flowFigure(f,a){
  const fig=el("figure","flow-figure"),box=el("div","media-wrap");box.append(mediaNode(a,f.alt));
  if(f.overlay)box.append(el("span","on-photo "+f.overlayAt,f.overlay));
  fig.append(box);if(f.caption)fig.append(el("figcaption","",f.caption));return fig;
}
export function flowBody(root,doc,assets,pages){
  const byId=new Map(assets.map(a=>[a.id,a])),after=new Map();
  for(const page of pages)for(const f of page.frames){const at=anchorParagraph(f,page)??Math.max(0,doc.body.length-1);if(!after.has(at))after.set(at,[]);after.get(at).push(f);}
  const fragment=document.createDocumentFragment();
  function appendFigures(at){for(const f of after.get(at)||[]){const a=byId.get(f.asset);if(a)fragment.append(flowFigure(f,a));}}
  doc.body.forEach((p,index)=>{const n=el(p.kind==="quote"?"blockquote":p.kind);runMarkup(n,p.runs);fragment.append(n);appendFigures(index);});
  if(!doc.body.length)appendFigures(0);root.replaceChildren(fragment);
}
export function createProof(root,options={}){
  const editing=!!options.editing;let doc,assets=[],selected="",measure=measurer(),paras,lastBody=null,pages=[],scheduled=0,layoutDirty=true;
  root.classList.add("press-root");
  let sections=[];
  const sr=el("div","visually-hidden");if(!editing)root.append(sr);
  function dimensions(){
    const width=sections[0]?.outer.clientWidth||0;if(!width)return;
    const scale=Math.min(1,width/WIDTH);
    for(let i=0;i<sections.length;i++){
      const s=sections[i];s.viewport.style.height=(editing?HEIGHT:pages[i].height)*scale+"px";s.viewport.style.width=WIDTH*scale+"px";
      s.sheet.style.transform="scale("+scale+")";
    }
  }
  function makePage(){
    const outer=el("section","proof-page"),tag=el("div","sheet-tag"),viewport=el("div","sheet-viewport"),sheet=el("div","press-sheet");
    const lines=el("div","press-lines"),media=el("div","press-frames");lines.setAttribute("aria-hidden","true");
    if(editing){outer.append(tag);sheet.tabIndex=0;sheet.setAttribute("role","group");}
    sheet.append(lines,media);viewport.append(sheet);outer.append(viewport);root.append(outer);
    return {outer,tag,viewport,sheet,lines,media,figures:new Map()};
  }
  function makeFrame(f,a){
    const fig=el("figure","press-frame"),box=el("div","frame-box"),caption=el("figcaption","frame-caption"),overlay=el("span","on-photo"),visual=mediaNode(a,f.alt,editing);
    box.append(visual,overlay);fig.append(box,caption);fig.dataset.frame=f.id;
    if(editing){fig.tabIndex=0;fig.setAttribute("role","group");const handle=el("button","size-handle");handle.type="button";handle.title="Resize media. Hold Shift to keep its proportions.";handle.setAttribute("aria-label","Resize media");handle.dataset.resize="true";fig.append(handle);}
    return {fig,box,caption,overlay,visual,asset:a.id,lastCaption:"\u0000"};
  }
  function renderFrame(s,f,a){
    let v=s.figures.get(f.id);
    if(!v||v.asset!==a.id){v?.fig.remove();v=makeFrame(f,a);s.figures.set(f.id,v);s.media.append(v.fig);}
    positioned(v.fig,f.x,f.y,f.w,f.totalH);v.box.style.height=f.h+"px";
    v.fig.classList.toggle("selected",editing&&selected===f.id);
    if(editing)v.fig.setAttribute("aria-label",(a.kind==="video"?"Video":"Photo")+", "+(f.alt||a.name)+". Use arrow keys to move.");
    if(v.visual.tagName==="IMG")v.visual.alt=f.alt||a.alt||"";else v.visual.setAttribute("aria-label",f.alt||a.name);
    v.overlay.textContent=f.overlay;v.overlay.className="on-photo "+f.overlayAt;v.overlay.hidden=!f.overlay;
    const lines=f.captionLines.join("\n");if(v.lastCaption!==lines){v.caption.textContent=lines;v.caption.hidden=!lines;v.lastCaption=lines;}
  }
  function paint(){
    scheduled=0;if(!doc)return;
    if(lastBody!==doc.body){paras=prepare(doc.body,measure);lastBody=doc.body;}
    if(layoutDirty){pages=paginate(doc,paras,measure);layoutDirty=false;}
    const mediaById=new Map(assets.map(a=>[a.id,a]));
    while(sections.length>pages.length)sections.pop().outer.remove();
    while(sections.length<pages.length)sections.push(makePage());
    pages.forEach((p,i)=>{
      const s=sections[i],height=editing?HEIGHT:p.height;
      s.tag.textContent="Sheet "+(i+1);s.sheet.dataset.page=String(i);s.sheet.setAttribute("aria-label","Sheet "+(i+1));
      s.sheet.style.height=height+"px";
      const text=document.createDocumentFragment();
      for(const l of p.lines){
        const n=el("div","press-line type-"+l.kind);n.dataset.para=String(l.paragraph);
        const free=Math.max(0,l.room-l.used);
        const offset=doc.align==="right"?free:doc.align==="center"?free/2:0;
        positioned(n,l.x+offset,l.y,l.room-offset,l.line);
        if(doc.align==="justify"&&!l.finished&&l.gaps)n.style.wordSpacing=(free/l.gaps)+"px";
        runMarkup(n,l.pieces);text.append(n);
      }
      s.lines.replaceChildren(text);
      const ids=new Set();for(const f of p.frames){const a=mediaById.get(f.asset);if(a){ids.add(f.id);renderFrame(s,f,a);}}
      for(const [id,v] of s.figures){if(!ids.has(id)){v.fig.remove();s.figures.delete(id);}}
    });
    dimensions();options.onPaint?.(pages);
  }
  function schedule(){if(!scheduled)scheduled=requestAnimationFrame(paint);}
  function update(next,media,selection=""){
    const bodyChanged=lastBody!==next.body;doc=next;assets=media;selected=selection;layoutDirty=true;
    if(!editing&&bodyChanged){sr.replaceChildren();for(const p of doc.body){const n=el(p.kind==="quote"?"blockquote":p.kind);runMarkup(n,p.runs);sr.append(n);}}
    schedule();
  }
  function point(x,y){
    for(let i=0;i<sections.length;i++){const box=sections[i].viewport.getBoundingClientRect();if(box.width&&x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom)return {page:i,x:Math.round((x-box.left)*WIDTH/box.width),y:Math.round((y-box.top)*WIDTH/box.width)};}
    return null;
  }
  function select(id){selected=id;root.querySelectorAll(".press-frame").forEach(n=>n.classList.toggle("selected",n.dataset.frame===id));options.onSelect?.(id);}
  if(editing){
    root.addEventListener("dragover",e=>{const p=point(e.clientX,e.clientY);if(!p||!e.dataTransfer.types.includes("application/x-silvergrain-media"))return;e.preventDefault();e.dataTransfer.dropEffect="copy";sections.forEach((s,i)=>s.sheet.classList.toggle("drop-target",p.page===i));});
    root.addEventListener("dragleave",e=>{if(!root.contains(e.relatedTarget))sections.forEach(s=>s.sheet.classList.remove("drop-target"));});
    root.addEventListener("drop",e=>{const id=e.dataTransfer.getData("application/x-silvergrain-media");if(!id)return;e.preventDefault();sections.forEach(s=>s.sheet.classList.remove("drop-target"));const pos=point(e.clientX,e.clientY);if(pos)options.onPlace?.(id,pos);});
    root.addEventListener("pointerdown",e=>{
      const fig=e.target.closest("[data-frame]");if(!fig){if(e.target.closest(".press-sheet"))select("");return;}
      if(e.button!==0)return;e.preventDefault();select(fig.dataset.frame);
      const model=doc.frames.find(f=>f.id===fig.dataset.frame),visual=pages[model.page]?.frames.find(f=>f.id===model.id);
      if(!visual)return;const initial={...visual},resize=!!e.target.closest("[data-resize]");
      const box=sections[initial.page].viewport.getBoundingClientRect(),startX=e.clientX,startY=e.clientY;
      const grabX=(startX-box.left)*WIDTH/box.width-initial.x,grabY=(startY-box.top)*WIDTH/box.width-initial.y;
      const source=fig;source.setPointerCapture?.(e.pointerId);
      function move(ev){
        if(ev.pointerId!==e.pointerId)return;
        const dx=Math.round((ev.clientX-startX)*WIDTH/box.width),dy=Math.round((ev.clientY-startY)*WIDTH/box.width);
        if(resize){options.onMove?.(model.id,resizeFrame(initial,dx,dy,ev.shiftKey),"drag-"+e.pointerId);}
        else {const p=point(ev.clientX,ev.clientY);if(p)options.onMove?.(model.id,{page:p.page,x:clamp(Math.round(p.x-grabX),0,WIDTH-initial.w),y:clamp(Math.round(p.y-grabY),0,HEIGHT-initial.h)},"drag-"+e.pointerId);}
      }
      function end(ev){if(ev.pointerId!==e.pointerId)return;window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);options.onGestureEnd?.();}
      window.addEventListener("pointermove",move,{passive:true});window.addEventListener("pointerup",end);window.addEventListener("pointercancel",end);
    });
    root.addEventListener("focusin",e=>{const fig=e.target.closest("[data-frame]");if(fig)select(fig.dataset.frame);});
    root.addEventListener("keydown",e=>{
      const fig=e.target.closest("[data-frame]");if(!fig||!["ArrowUp","ArrowLeft","ArrowRight","ArrowDown"].includes(e.key))return;e.preventDefault();
      const f=doc.frames.find(f=>f.id===fig.dataset.frame),step=e.shiftKey?10:1,dx=(e.key==="ArrowRight"?1:e.key==="ArrowLeft"?-1:0)*step,dy=(e.key==="ArrowDown"?1:e.key==="ArrowUp"?-1:0)*step;
      if(e.target.closest("[data-resize]"))options.onMove?.(f.id,{w:clamp(f.w+dx,64,WIDTH-f.x),h:clamp(f.h+dy,40,Math.min(760,HEIGHT-f.y))});
      else options.onMove?.(f.id,{x:clamp(f.x+dx,0,WIDTH-f.w),y:clamp(f.y+dy,0,HEIGHT-f.h)});
    });
    root.addEventListener("dblclick",e=>{const line=e.target.closest(".press-line");if(line)options.onParagraph?.(Number(line.dataset.para),line.getBoundingClientRect());});
  }
  new ResizeObserver(dimensions).observe(root);
  Promise.allSettled([document.fonts.load('28px "Instrument Serif"'),document.fonts.load(captionFontForLoad())]).then(()=>{measure=measurer();lastBody=null;layoutDirty=true;schedule();});
  return {update,point,paint,dimensions,getPages:()=>pages};
}
function captionFontForLoad(){return "13px Inter";}
