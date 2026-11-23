export function startSiteSettings(state){
  const form=document.querySelector("#site-settings");
  const frame=document.querySelector("#site-preview"),viewport=document.querySelector("#preview-viewport");
  const status=document.querySelector("#settings-status"),previewStatus=document.querySelector("#preview-status");
  const publish=form.querySelector('[type="submit"]');
  let saved=structuredClone(state.settings),epoch=0,dirty=false,saving=false,request=0,timer;
  let width=1160;

  function values(){
    const value={revision:saved.revision};
    for(const input of form.querySelectorAll("[name]")){
      value[input.name]=input.type==="checkbox"?input.checked:input.type==="number"?input.valueAsNumber:input.value;
    }
    return value;
  }
  function fill(settings){
    for(const input of form.querySelectorAll("[name]")){
      if(input.type==="checkbox")input.checked=settings[input.name];
      else input.value=settings[input.name];
    }
    for(const input of form.querySelectorAll("[data-color-text]"))input.value=settings[input.dataset.colorText];
  }
  function scale(){
    const ratio=Math.min(1,viewport.clientWidth/width);
    frame.style.width=width+"px";frame.style.height="900px";
    frame.style.transform="scale("+ratio+")";
    viewport.style.height=900*ratio+"px";
  }
  new ResizeObserver(scale).observe(viewport);
  for(const button of document.querySelectorAll("[data-preview-width]"))button.onclick=()=>{
    width=Number(button.dataset.previewWidth);
    for(const other of document.querySelectorAll("[data-preview-width]"))other.setAttribute("aria-pressed",String(other===button));
    scale();
  };
  async function send(path,value){
    const response=await fetch("/cntrladmin/api/"+path,{method:"POST",headers:{"X-Journal-Write":"studio","Content-Type":"application/json"},body:JSON.stringify(value)});
    const result=await response.json().catch(()=>({error:"Open the dashboard in another tab to sign in again."}));
    if(!response.ok||result.error)throw new Error(result.error||"The request did not finish.");
    return result;
  }
  async function preview(){
    if(!form.checkValidity()){previewStatus.textContent="Complete the highlighted fields to update the preview.";return;}
    const token=++request;
    previewStatus.textContent="Updating preview…";
    try{
      const result=await send("site-preview",values());
      if(token!==request)return;
      frame.srcdoc=result.html;
      previewStatus.textContent=dirty?"Preview shows unsaved changes.":"Published appearance";
    }catch(error){if(token===request)previewStatus.textContent=error.message;}
  }
  function changed(){
    dirty=true;epoch++;request++;
    status.classList.remove("error");status.textContent="Unsaved changes";
    clearTimeout(timer);timer=setTimeout(preview,300);
  }
  form.addEventListener("input",event=>{
    const input=event.target;
    if(input.dataset.colorText){
      if(!/^#[a-f\d]{6}$/i.test(input.value)){changed();return;}
      form.elements.namedItem(input.dataset.colorText).value=input.value;
    }else if(input.type==="color"){
      form.querySelector('[data-color-text="'+input.name+'"]').value=input.value;
    }
    changed();
  });
  form.onsubmit=async event=>{
    event.preventDefault();if(saving||!form.reportValidity())return;
    const captured=epoch;
    saving=true;publish.disabled=true;status.classList.remove("error");status.textContent="Publishing…";
    try{
      saved=await send("site-settings",values());
      document.querySelector(".studio-mast .mini-brand").textContent=saved.name;
      document.title="Site settings · "+saved.name;
      if(captured===epoch){dirty=false;fill(saved);}
      status.textContent=dirty?"Settings published. You have unsaved changes.":"Site settings published.";
      clearTimeout(timer);await preview();
    }catch(error){status.classList.add("error");status.textContent=error.message;}
    finally{saving=false;publish.disabled=false;}
  };
  document.querySelector("#revert-settings").onclick=()=>{
    if(saving)return;
    fill(saved);dirty=false;epoch++;request++;clearTimeout(timer);
    status.classList.remove("error");status.textContent="Unsaved changes reverted.";preview();
  };
  document.querySelector("#default-settings").onclick=()=>{
    if(saving)return;
    fill({...state.defaults,revision:saved.revision});changed();
  };
  window.addEventListener("beforeunload",event=>{if(dirty||saving){event.preventDefault();event.returnValue="";}});
}
