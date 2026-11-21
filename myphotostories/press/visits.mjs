// First-party, opt-in statistics. No identifiers or events are sent before consent.
const key='myphotostories-visit-choice',ttl=180*86400000;
let policy,panel,info,status,allow,decline,busy=false,focusReturn;
const eventId=crypto.randomUUID();
const protectedChoice=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1';
function savedChoice(){try{const v=JSON.parse(localStorage.getItem(key));return v&&v.until>Date.now()&&v.policy===policy.policy?v:null;}catch{return null;}}
function remember(allowed){try{localStorage.setItem(key,JSON.stringify({allowed,until:Date.now()+ttl,policy:policy.policy}));}catch{}}
function element(tag,className,text){const e=document.createElement(tag);if(className)e.className=className;if(text)e.textContent=text;return e;}
async function send(action){
  const r=await fetch('/visit-event',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-Journal-Visit':'1'},body:JSON.stringify({action,policy:policy.policy,eventId,page:window.MyPhotoStories.sourceURL(),referrer:document.referrer})});
  if(!r.ok)throw new Error('Could not save your preference. Please try again.');return r.json();
}
function hide(){panel.hidden=true;focusReturn?.focus();focusReturn=null;}
function show(manual=false){
  if(!panel){
    panel=element('section','visit-consent');panel.setAttribute('role','region');panel.setAttribute('aria-label','Visit statistics preferences');
    const heading=element('h2','','Visit statistics'),link=element('a','','Privacy details');link.href='/privacy';
    info=element('p');status=element('p','visit-consent-status');status.setAttribute('role','status');
    const actions=element('div','visit-consent-actions');allow=element('button','','Allow statistics');decline=element('button','','Decline statistics');allow.type=decline.type='button';actions.append(decline,allow);
    allow.addEventListener('click',()=>choose(true));decline.addEventListener('click',()=>choose(false));
    const close=element('button','visit-dismiss','Close');close.type='button';close.addEventListener('click',hide);
    panel.append(heading,info,link,actions,status,close);panel.addEventListener('keydown',e=>{if(e.key==='Escape')hide();});document.body.append(panel);
  }
  const blocked=protectedChoice(),choice=savedChoice();
  info.textContent=policy.excluded?'Your signed-in owner visits are excluded from the statistics.':!policy.enabled?'The owner has paused visitor statistics.':blocked?'Your browser’s privacy preference disables new visit statistics. You can also delete this browser’s recorded history below.':`May this journal record your ${policy.ipMode==='full'?'IP address':policy.ipMode==='masked'?'shortened IP address':'visit details without storing an IP address'}, approximate location, device, pages viewed and arrival source for ${policy.retentionDays} days? You can decline and browse freely. Disabling statistics also deletes this browser’s recorded visits.`;
  allow.hidden=blocked||!policy.enabled||policy.excluded;
  decline.textContent=choice?.allowed||blocked?'Disable & delete my visits':'Decline statistics';status.textContent='';panel.hidden=false;
  if(manual)decline.focus();
}
async function choose(allowed){
  if(busy)return;busy=true;allow.disabled=decline.disabled=true;status.textContent='Saving…';
  try{
    const result=await send(allowed?'allow':'deny');
    if(result.needsConsent){status.textContent='The statistics policy changed. Reload this page to review it.';return;}
    remember(allowed);hide();
  }catch(error){status.textContent=error.message;}finally{busy=false;allow.disabled=decline.disabled=false;}
}
async function initialise(){
  try{
    const r=await fetch('/visit-policy',{credentials:'same-origin',cache:'no-store'});if(!r.ok)return;policy=await r.json();
    document.querySelectorAll('[data-visit-preferences]').forEach(button=>button.addEventListener('click',()=>{focusReturn=button;show(true);}));
    if(!policy.enabled||policy.excluded||protectedChoice())return;
    const choice=savedChoice();
    // New or changed preferences stay untracked. Only the footer opens the panel.
    if(choice?.allowed)await send('view');
  }catch{/* Statistics never interrupt the public page. */}
}
initialise();
