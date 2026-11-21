import {createProof,flowBody} from "./proof.mjs";
const {doc,assets}=JSON.parse(document.querySelector("#article-data").textContent);
const root=document.querySelector("#article-press"),flow=document.querySelector("#article-fallback"),tools=document.querySelector("#read-tools");
const narrow=matchMedia("(max-width: 700px)");let selected=null,built=false;
function choose(next){const view=next||(narrow.matches?"flow":"paper");root.hidden=view!=="paper";flow.hidden=view!=="flow";for(const b of tools.querySelectorAll("[data-view]"))b.setAttribute("aria-pressed",String(b.dataset.view===view));if(view==="paper")proof.dimensions();}
const proof=createProof(root,{onPaint(pages){if(!built){built=true;flowBody(flow,doc,assets,pages);}choose(selected);}});
proof.update(doc,assets);tools.hidden=false;choose();
for(const b of tools.querySelectorAll("[data-view]"))b.onclick=()=>{selected=b.dataset.view;choose(selected);};
narrow.addEventListener("change",()=>{if(!selected)choose();});
document.querySelector("#print").onclick=()=>window.print();
window.addEventListener("beforeprint",()=>{choose("paper");proof.dimensions();});
window.addEventListener("afterprint",()=>choose(selected));
