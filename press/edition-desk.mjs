import {createProof} from "./proof.mjs";
export function emailDelivery(send) {
  const form=document.querySelector("#sender-form"),status=document.querySelector("#email-status");
  form.onsubmit=async e=>{
    e.preventDefault();const button=form.querySelector("button");button.disabled=true;
    try{
      const v=await send("notice-sender",{from:form.elements.from.value,key:form.elements.key.value});
      form.elements.key.value="";document.querySelector("#sender-state").textContent="Configured sender · "+v.from;
      status.textContent="Sender saved. Readers can now request confirmation and sign-in emails.";
    }catch(err){status.textContent=err.message;}finally{button.disabled=false;}
  };
}
export function editionStudio(data,send) {
  const $=s=>document.querySelector(s),frame=$("#edition-preview"),viewport=$("#edition-window"),status=$("#edition-status"),apply=$("#apply-edition"),dialog=$("#edition-confirm");
  const choices=[...document.querySelectorAll("[data-show-edition]")];
  const name=id=>data.editions.find(e=>e.id===id).name;
  let selected=data.id,active=data.id,revision=data.revision,sequence=0,loaded=false,applying=false;
  function controls(){apply.disabled=!loaded||selected===active||applying;for(const b of choices)b.setAttribute("aria-pressed",String(b.dataset.showEdition===selected));}
  function resize(){
    const mobile=$("#edition-screen").value==="mobile",width=mobile?(Number(data.mobileWidth)||1160):1160;
    const visible=Math.max(1,Math.min(viewport.clientWidth,mobile?390:width)),scale=visible/width;
    const visibleHeight=mobile?Math.min(680,visible*1.85):Math.min(700,Math.max(340,visible*.64));
    frame.style.width=width+"px";frame.style.height=visibleHeight/scale+"px";
    frame.style.transform="scale("+scale+")";frame.style.left=(viewport.clientWidth-visible)/2+"px";viewport.style.height=visibleHeight+"px";
  }
  async function preview(id) {
    selected=id;const seq=++sequence;loaded=false;controls();$("#proof-name").textContent=name(id);
    status.textContent="Loading preview…";frame.removeAttribute("srcdoc");resize();
    try {
      const r=await send("theme-preview",{id,page:$("#edition-page").value,screen:$("#edition-screen").value});
      if(seq!==sequence)return;
      frame.srcdoc=r.html;loaded=true;controls();status.textContent=id===active?"This theme is live.":"Preview only. Your live theme is "+name(active)+".";
    }catch(e){if(seq===sequence)status.textContent=e.message;}
  }
  for(const b of choices)b.onclick=()=>{preview(b.dataset.showEdition);if(matchMedia("(max-width:700px)").matches)$("#proof-name").scrollIntoView({block:"start"});};
  $("#edition-page").onchange=$("#edition-screen").onchange=()=>preview(selected);
  apply.onclick=()=>{$("#edition-confirm-copy").textContent="Apply "+name(selected)+" to the public blog?";dialog.returnValue="cancel";dialog.showModal();};
  dialog.onclose=async()=>{
    if(dialog.returnValue!=="apply"||!loaded||applying)return;
    const choice=selected;applying=true;controls();
    try{
      const v=await send("apply-theme",{id:choice,revision});active=v.id;revision=v.revision;
      for(const badge of document.querySelectorAll("[data-active]"))badge.hidden=badge.dataset.active!==active;
      status.textContent=name(active)+" is now live.";
    }catch(e){status.textContent=e.message;}finally{applying=false;controls();}
  };
  frame.addEventListener("load",()=>{
    const doc=frame.contentDocument,record=doc?.querySelector("#article-data"),paper=doc?.querySelector("#article-press");
    if(!record||!paper)return;
    const article=JSON.parse(record.textContent);
    // Reuse the newspaper layout engine without enabling scripts in the sandbox.
    paper.hidden=false;
    const proof=createProof(paper,{onPaint(){doc.querySelector("#article-fallback").classList.add("preview-transcript");}});
    proof.update(article.doc,article.assets);
  });
  new ResizeObserver(resize).observe(viewport);preview(selected);
}
