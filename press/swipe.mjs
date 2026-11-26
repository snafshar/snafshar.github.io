const scope = document.querySelector("main");
const pager = scope?.querySelector("nav.story-pager, nav.pager");
if (scope && pager) {
  let start = null;
  const interactive = "button,input,select,textarea,video,audio,[data-home-gallery],[contenteditable=true]";
  scope.addEventListener("touchstart", event => {
    const point = event.touches[0];
    start = event.touches.length === 1 && !event.target.closest(interactive)
      ? { x: point.clientX, y: point.clientY, id: point.identifier }
      : null;
  }, { passive: true });
  scope.addEventListener("touchcancel", () => { start = null; }, { passive: true });
  scope.addEventListener("touchend", event => {
    const from = start;
    start = null;
    if (!from || event.touches.length || !window.getSelection()?.isCollapsed) return;
    const end = Array.from(event.changedTouches).find(point => point.identifier === from.id);
    if (!end) return;
    const dx = end.clientX - from.x, dy = Math.abs(end.clientY - from.y);
    if (Math.abs(dx) < 80 || Math.abs(dx) < 2.5 * dy) return;
    const link = pager.querySelector(dx < 0 ? 'a[rel="next"]' : 'a[rel="prev"]');
    if (link) location.assign(link.href);
  }, { passive: true });
}
