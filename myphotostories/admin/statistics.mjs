export function initStatistics(state){
  const form=document.querySelector('#visit-settings');if(!form)return;
  let revision=state.settings.revision;
  async function send(path,value){
    const r=await fetch('/cntrladmin/api/'+path,{method:'POST',headers:{'Content-Type':'application/json','X-Journal-Write':'studio'},body:JSON.stringify(value)});
    const result=await r.json().catch(()=>({error:'Your session may have expired. Sign in through the dashboard in another tab.'}));
    if(!r.ok||result.error)throw new Error(result.error||'Could not save the change.');return result;
  }
  form.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.querySelector('#visit-settings-status'),button=form.querySelector('button');button.disabled=true;
    status.textContent='Saving…';
    try{
      const result=await send('visit-settings',{revision,enabled:form.elements.enabled.checked,retentionDays:Number(form.elements.retentionDays.value),ipMode:form.elements.ipMode.value});
      revision=result.revision;status.textContent='Saved. Refresh the report to see the current totals.';
    }catch(error){status.textContent=error.message;status.setAttribute('role','alert');}finally{button.disabled=false;}
  });
  const clear=document.querySelector('#clear-visits');
  clear.addEventListener('submit',async e=>{
    e.preventDefault();const status=document.querySelector('#clear-status'),button=clear.querySelector('button');button.disabled=true;
    try{await send('clear-visits',{confirmation:clear.elements.confirmation.value});location.assign(window.MyPhotoStories.routeURL('/cntrladmin/statistics'));}
    catch(error){status.textContent=error.message;status.setAttribute('role','alert');button.disabled=false;}
  });
  const link=document.querySelector('#visit-link'),linkStatus=document.querySelector('#visit-link-status'),copy=document.querySelector('#copy-visit-link');
  link.addEventListener('submit',e=>{
    e.preventDefault();
    try{
      const url=new URL(link.elements.page.value,location.origin),p=url.pathname;
      if(url.origin!==location.origin||!(/^\/(?:archive|about|news|contact|privacy)?$/.test(p)||/^\/(story|news)\/[a-z0-9][a-z0-9-]{0,89}$/.test(p)))throw new Error('Enter a public page or published post on this website.');
      const page=url.searchParams.get('page');url.search='';url.hash='';
      if(page&&/^\d{1,5}$/.test(page)&&Number(page)>1)url.searchParams.set('page',page);
      url.searchParams.set('utm_source',link.elements.source.value.trim().toLowerCase());
      if(link.elements.campaign.value.trim())url.searchParams.set('utm_campaign',link.elements.campaign.value.trim());
      link.elements.result.value=window.MyPhotoStories.routeURL(url.href);copy.hidden=false;linkStatus.textContent='Ready to share. Visits are counted when the visitor allows statistics.';
    }catch(error){linkStatus.textContent=error.message;copy.hidden=true;}
  });
  copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(link.elements.result.value);linkStatus.textContent='Link copied.';}catch{link.elements.result.select();linkStatus.textContent='Select and copy the sharing link.';}});
}
