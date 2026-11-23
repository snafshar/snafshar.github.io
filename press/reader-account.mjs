const root=document.querySelector(".reader-account");
if(root)start(root);
function start(root) {
  const $=selector=>root.querySelector(selector), forms=$("#reader-forms"),link=$("#reader-link"),profile=$("#reader-profile"),status=$("#reader-status");
  const key="myphotostories-reader-session";
  let session="",ticket=null,tab="signup",busy=false;
  try{session=sessionStorage.getItem(key)||"";}catch{}
  const saveSession=value=>{session=value;try{if(value)sessionStorage.setItem(key,value);else sessionStorage.removeItem(key);}catch{}};
  const ready=root.dataset.ready==="true";
  async function send(action,data) {
    const r=await fetch("/notifications/api/"+action,{method:"POST",credentials:"omit",cache:"no-store",headers:{"Content-Type":"application/json","X-Journal-Write":"reader"},body:JSON.stringify(data)});
    const result=await r.json();
    if(!r.ok){const error=new Error(result.error||"The request could not be completed.");error.status=r.status;throw error;}
    return result;
  }
  function show(node) {for(const section of [forms,link,profile])section.hidden=section!==node;}
  function select(next) {
    tab=next;for(const button of root.querySelectorAll("[data-reader-tab]"))button.setAttribute("aria-pressed",String(button.dataset.readerTab===tab));
    for(const form of [$("#reader-signup"),$("#reader-signin")]){form.hidden=form.id!=="reader-"+tab;form.querySelector("fieldset").disabled=!ready&&form.id==="reader-signin";}
  }
  async function work(button,op) {
    if(busy)return;busy=true;button.disabled=true;status.textContent="";
    try{await op();}catch(e){status.textContent=e.message||"Please try again.";}finally{button.disabled=false;busy=false;}
  }
  function showProfile(v) {$("#reader-person").textContent=v.name+" "+v.surname;$("#reader-address").textContent=v.email;show(profile);}
  function linkPanel(purpose) {
    const copy={
      confirm:["Confirm your subscription","Start receiving email when a new photo story is published.","Confirm subscription"],
      signin:["Sign in to your subscription","Continue to manage your new-post emails.","Sign in"],
      unsubscribe:["Unsubscribe from new posts?","This stops the emails and deletes your subscriber profile.","Confirm unsubscribe"]
    }[purpose];
    $("#link-heading").textContent=copy[0];$("#link-copy").textContent=copy[1];$("#use-link").textContent=copy[2];show(link);
  }
  for(const button of root.querySelectorAll("[data-reader-tab]"))button.onclick=()=>{status.textContent="";select(button.dataset.readerTab);};
  select(tab);
  for(const action of ["signup","signin"]){
    const form=$("#reader-"+action);
    form.onsubmit=e=>{e.preventDefault();const button=form.querySelector("button");work(button,async()=>{
      const info=Object.fromEntries(new FormData(form));if(action==="signup")info.consent=form.elements.consent.checked;
      const result=await send(action,info);form.reset();status.textContent=result.message;
    });};
  }
  $("#reader-signout").onclick=e=>work(e.currentTarget,async()=>{await send("signout",{session});saveSession("");show(forms);select("signin");status.textContent="You’re signed out.";});
  $("#reader-remove").onclick=()=>{ticket={purpose:"unsubscribe",fromSession:true};status.textContent="";linkPanel(ticket.purpose);};
  $("#cancel-link").onclick=()=>{const back=ticket?.fromSession;ticket=null;status.textContent="";show(back?profile:forms);};
  $("#use-link").onclick=e=>work(e.currentTarget,async()=>{
    if(!ticket)return;
    if(ticket.purpose==="unsubscribe"){
      const result=await send("unsubscribe",ticket.fromSession?{session}:{ticket:ticket.token});
      saveSession("");ticket=null;show(forms);status.textContent=result.message;
    }else{
      const v=await send("exchange",ticket);ticket=null;saveSession(v.session);showProfile(v);status.textContent="You’re signed in.";
    }
  });
  const match=/^#(confirm|signin|unsubscribe)=([a-f0-9.-]+)$/.exec(location.hash);
  if(match){
    history.replaceState(null,"",location.pathname+location.search);
    ticket={purpose:match[1],token:match[2]};linkPanel(ticket.purpose);
  }else if(session){
    send("profile",{session}).then(showProfile).catch(e=>{if(e.status===401)saveSession("");else status.textContent=e.message;});
  }
}
