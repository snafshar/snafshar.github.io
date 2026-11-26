export function startPageSettings(state,send){
  const form=document.querySelector("#page-settings"),choice=document.querySelector("#page-choice"),status=document.querySelector("#page-style-status");
  const groups=[...form.querySelectorAll("[data-page-group]")],tabs=[...form.querySelectorAll("[data-page-profile]")];
  let active="desktop",revision=state.revision,dirty=false,saving=false;
  function select(profile){active=profile;for(const tab of tabs)tab.setAttribute("aria-pressed",String(tab.dataset.pageProfile===profile));for(const g of groups)g.hidden=g.dataset.pageGroup!==profile;}
  for(const tab of tabs)tab.onclick=()=>select(tab.dataset.pageProfile);
  function changed(){dirty=true;status.textContent="Unsaved page settings.";}
  const groupOf=n=>n.closest("[data-page-group]");
  for(const use of form.querySelectorAll("[data-use]"))use.onchange=()=>{
    groupOf(use).querySelector('[data-page-value="'+use.dataset.use+'"]').disabled=!use.checked;changed();
  };
  form.addEventListener("input",changed);
  document.querySelector("#inherit-page").onclick=()=>{
    const group=groups.find(g=>g.dataset.pageGroup===active);
    for(const input of group.querySelectorAll("[data-use]"))input.checked=false;
    for(const field of group.querySelectorAll("[data-page-value]"))field.disabled=true;
    changed();
  };
  choice.onchange=()=>{
    if(dirty&&!confirm("Discard unsaved changes to this page?")){choice.value=state.path;return;}
    dirty=false;const dest="/cntrladmin/page-settings?"+new URLSearchParams({page:choice.value});
    location.assign(window.MyPhotoStories?.routeURL(dest)||dest);
  };
  window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue="";}});
  form.onsubmit=async e=>{
    e.preventDefault();if(saving)return;
    const value={revision,desktop:{},mobile:{},general:{}};
    for(const g of groups)for(const field of g.querySelectorAll("[data-page-value]:not(:disabled)")){
      if(!field.checkValidity()){select(g.dataset.pageGroup);field.reportValidity();return;}
      value[g.dataset.pageGroup][field.dataset.pageValue]=field.type==="number"?field.valueAsNumber:field.dataset.type==="checkbox"?field.value==="true":field.value;
    }
    saving=true;choice.disabled=true;form.inert=true;status.textContent="Saving…";
    try{const v=await send("page-settings",{page:state.path,settings:value});revision=v.revision;dirty=false;status.textContent="Settings saved for this page.";}
    catch(err){status.textContent=err.message;}finally{saving=false;choice.disabled=false;form.inert=false;}
  };
}
