for(const gallery of document.querySelectorAll("[data-home-gallery]"))activate(gallery);
function activate(gallery){
  const track=gallery.querySelector(".home-track"),slides=[...track.children];
  const controls=gallery.querySelector(".home-controls"),previous=controls.querySelector("[data-prev]"),next=controls.querySelector("[data-next]"),counter=controls.querySelector("output");
  let current=0,drag=null,suppressClick=false,scheduled=false;
  const reduced=matchMedia("(prefers-reduced-motion: reduce)");
  function sync(){
    scheduled=false;
    const width=track.clientWidth;if(!width)return;
    current=Math.max(0,Math.min(slides.length-1,Math.round(track.scrollLeft/width)));
    previous.disabled=current===0;next.disabled=current===slides.length-1;
    counter.textContent=(current+1)+" / "+slides.length;
    for(const [i,slide] of slides.entries())slide.querySelector("a").tabIndex=i===current?0:-1;
  }
  function go(i){track.scrollTo({left:Math.max(0,Math.min(slides.length-1,i))*track.clientWidth,behavior:reduced.matches?"instant":"smooth"});}
  previous.onclick=()=>go(current-1);next.onclick=()=>go(current+1);
  track.addEventListener("keydown",e=>{
    if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
    const target={ArrowLeft:current-1,ArrowRight:current+1,Home:0,End:slides.length-1}[e.key];
    if(target===undefined)return;e.preventDefault();track.focus({preventScroll:true});go(target);
  });
  track.addEventListener("scroll",()=>{if(!scheduled){scheduled=true;requestAnimationFrame(sync);}},{passive:true});
  new ResizeObserver(sync).observe(track);
  // Touch and trackpad scrolling use the browser's scroll snapping. Add click-and-drag for a mouse.
  track.addEventListener("dragstart",e=>e.preventDefault());
  track.addEventListener("pointerdown",e=>{
    if(e.pointerType!=="mouse"||e.button!==0)return;
    suppressClick=false;drag={id:e.pointerId,x:e.clientX,left:track.scrollLeft,index:current,active:false};
  });
  track.addEventListener("pointermove",e=>{
    if(!drag||drag.id!==e.pointerId||!e.buttons)return;
    const dx=(e.clientX-drag.x)*track.clientWidth/Math.max(1,track.getBoundingClientRect().width);
    if(!drag.active&&Math.abs(dx)<6)return;
    if(!drag.active){drag.active=true;track.setPointerCapture(e.pointerId);track.classList.add("dragging");}
    e.preventDefault();track.scrollLeft=drag.left-dx;
  });
  function finish(e){
    if(!drag||e.pointerId!==drag.id)return;
    const from=drag;drag=null;if(!from.active)return;
    const dx=track.scrollLeft-from.left,width=track.clientWidth;
    const index=Math.abs(dx)>Math.min(45,width*.12)?from.index+Math.sign(dx):Math.round(track.scrollLeft/width);
    suppressClick=true;setTimeout(()=>{suppressClick=false;},0);track.classList.remove("dragging");go(index);
  }
  track.addEventListener("pointerup",finish);track.addEventListener("pointercancel",finish);
  track.addEventListener("pointerleave",()=>{if(drag&&!drag.active)drag=null;});
  track.addEventListener("click",e=>{if(suppressClick){e.preventDefault();e.stopPropagation();}},true);
  controls.hidden=false;sync();
}
