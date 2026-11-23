// A desktop-width layout scaled to the phone viewport. Pinch zoom remains available.
const config=document.querySelector('meta[name="journal-mobile-canvas"]');
const viewport=document.querySelector('meta[name="viewport"]');
const mobile=matchMedia('(max-device-width: 760px)').matches;
if(config&&viewport&&mobile){
  document.documentElement.dataset.mobileLayout="true";
  const width=Number(config.content)||1160;
  function fit(){const available=window.visualViewport?.width*window.visualViewport?.scale||screen.width;viewport.content=`width=${width}, initial-scale=${Math.min(1,available/width)}`;}
  fit();window.addEventListener('orientationchange',()=>setTimeout(fit,200));
}
