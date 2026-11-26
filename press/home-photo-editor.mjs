import {homePhotoIds,maxHomePhotos} from "./home-photo-list.mjs";

export function editHomePhotos(doc,assets,changed){
  const panel=document.querySelector("#home-photos"),order=panel.querySelector("ol"),picker=panel.querySelector(".home-picker"),status=panel.querySelector("[role=status]"),counter=panel.querySelector("[data-count]");
  const restore=panel.querySelector("[data-default]"),upload=panel.querySelector("[data-upload-home]");
  let signature="",dragId="";
  const map=()=>new Map(assets.map(a=>[a.id,a]));
  const selected=()=>homePhotoIds(doc,map());
  function button(label,onClick,disabled=false){
    const b=document.createElement("button");b.type="button";b.textContent=label;b.disabled=disabled;b.className="outline-btn";b.onclick=onClick;return b;
  }
  function thumb(asset){
    const img=document.createElement("img");img.src=asset.thumb;img.alt="";img.loading="lazy";img.draggable=false;return img;
  }
  function commit(list,message){
    doc.homepagePhotos=list;changed();refresh();status.textContent=message;
  }
  function put(id,before){
    const a=map().get(id);if(!a||a.kind!=="image")return;
    const list=selected(),pos=list.indexOf(id),target=list.indexOf(before);
    if(pos<0&&list.length>=maxHomePhotos){status.textContent="The gallery already contains 20 photos.";return;}
    if(pos>=0&&!before)return;
    if(id===before)return;
    if(pos>=0)list.splice(pos,1);
    list.splice(before&&target>=0?list.indexOf(before):list.length,0,id);
    commit(list,a.name+(pos<0?" added.":" moved."));
  }
  function move(id,delta){
    const list=selected(),i=list.indexOf(id),to=i+delta;
    if(i<0||to<0||to>=list.length)return;
    [list[i],list[to]]=[list[to],list[i]];commit(list,"Photo moved to position "+(to+1)+".");
    const row=order.children[to],direction=delta<0?"[data-earlier]":"[data-later]";
    (row?.querySelector(direction+":not(:disabled)")||row?.querySelector("button:not(:disabled)"))?.focus();
  }
  function startDrag(node,id){
    node.draggable=true;node.ondragstart=e=>{dragId=id;e.dataTransfer.setData("text/x-journal-home-photo",id);e.dataTransfer.effectAllowed="move";};
    node.ondragend=()=>{dragId="";};
  }
  order.ondragover=e=>{if(dragId)e.preventDefault();};
  order.ondrop=e=>{
    if(!dragId)return;e.preventDefault();const id=dragId;dragId="";
    const before=e.target.closest("[data-photo]")?.dataset.photo;
    if(!before&&selected().includes(id)){commit([...selected().filter(v=>v!==id),id],"Photo moved to the end.");return;}
    put(id,before);
  };
  function refresh(){
    if(!panel.open)return;
    const byId=map(),list=homePhotoIds(doc,byId),shape=JSON.stringify([list,doc.homepagePhotos!==undefined,assets.length]);
    if(shape===signature)return;signature=shape;
    counter.textContent=list.length+" of "+maxHomePhotos+" photos";
    restore.hidden=!Array.isArray(doc.homepagePhotos);
    order.replaceChildren();
    for(const [i,id] of list.entries()){
      const a=byId.get(id),li=document.createElement("li"),name=document.createElement("span"),actions=document.createElement("div");
      li.dataset.photo=id;startDrag(li,id);
      name.textContent=a.name;name.className="home-photo-name";const prev=button("Earlier",()=>move(id,-1),i===0),next=button("Later",()=>move(id,1),i===list.length-1);
      prev.dataset.earlier="";next.dataset.later="";prev.setAttribute("aria-label","Move "+a.name+" earlier");next.setAttribute("aria-label","Move "+a.name+" later");
      const remove=button("Remove",()=>{commit(selected().filter(v=>v!==id),a.name+" removed.");(order.children[Math.min(i,order.children.length-1)]?.querySelector("button:not(:disabled)")||upload).focus();});
      remove.setAttribute("aria-label","Remove "+a.name);actions.append(prev,next,remove);li.append(thumb(a),name,actions);order.append(li);
    }
    picker.replaceChildren();
    for(const a of assets.filter(item=>item.kind==="image")){
      const used=list.includes(a.id),b=button(a.name,()=>put(a.id),used||list.length===maxHomePhotos);
      b.prepend(thumb(a));b.setAttribute("aria-label",(used?"Selected: ":"Add ")+a.name);b.title=a.name;if(!used)startDrag(b,a.id);picker.append(b);
    }
    upload.disabled=list.length>=maxHomePhotos;
  }
  restore.onclick=()=>{delete doc.homepagePhotos;changed();refresh();status.textContent="The default photo selection has been restored.";};
  panel.addEventListener("toggle",refresh);
  return {refresh,add:id=>put(id),available:()=>maxHomePhotos-selected().length};
}
