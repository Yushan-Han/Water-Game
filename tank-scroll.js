const viewport = document.querySelector('.tank-viewport');
const world = document.querySelector('.tank-world');
const track = document.querySelector('.tank-scroll-track');
const thumb = document.querySelector('#tankThumb');
let position = 0, dragging = null;
function metrics() {
  return { travel: Math.max(0, track.clientWidth - thumb.offsetWidth), overflow: Math.max(0, world.offsetWidth - viewport.clientWidth) };
}
export function setTankPosition(value) {
  position = Math.max(0, Math.min(1, value));
  const {travel, overflow} = metrics();
  thumb.style.transform = `translateX(${position * travel}px)`;
  world.style.transform = `translateX(${-position * overflow}px)`;
  thumb.setAttribute('aria-valuenow', String(Math.round(position * 100)));
}
thumb.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (e.pointerType !== 'touch') e.preventDefault();
  dragging = {id:e.pointerId, x:e.clientX, start:position};
  thumb.setPointerCapture(e.pointerId);
});
thumb.addEventListener('pointermove', e => {
  if (!dragging || e.pointerId !== dragging.id) return;
  const scale = track.getBoundingClientRect().width / track.clientWidth;
  const travel = metrics().travel * scale;
  if (travel > 0) setTankPosition(dragging.start + (e.clientX - dragging.x) / travel);
});
for (const type of ['pointerup','pointercancel','lostpointercapture']) thumb.addEventListener(type, e => {
  if (dragging?.id === e.pointerId) dragging = null;
});
track.addEventListener('pointerdown', e => {
  if (thumb.contains(e.target) || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const r = track.getBoundingClientRect(), scale = r.width / track.clientWidth;
  const travel = metrics().travel * scale;
  if (travel > 0) setTankPosition((e.clientX - r.left - thumb.offsetWidth * scale / 2) / travel);
});
document.querySelector('#tankLeft').addEventListener('click', () => setTankPosition(position - .12));
document.querySelector('#tankRight').addEventListener('click', () => setTankPosition(position + .12));
thumb.addEventListener('keydown', e => {
  const actions = {ArrowLeft:position-.05, ArrowRight:position+.05, PageUp:position-.3, PageDown:position+.3, Home:0, End:1};
  if (!(e.key in actions)) return;
  e.preventDefault(); e.stopPropagation(); setTankPosition(actions[e.key]);
});
new ResizeObserver(() => setTankPosition(position)).observe(track);
setTankPosition(0);
