// Route media through a gain stage: mobile media.volume may be read-only.
export function createAudioSession({media,onStop=()=>{},doc=document,page=window}){
 let context,gain,level=.4,muted=false,inactive=doc.hidden;
 function sync(){
  if(gain)gain.gain.value=inactive||muted?0:level;
  for(const element of media){
   element.volume=gain?1:level;
   element.muted=inactive||muted||level===0;
  }
 }
 function stop(){
  inactive=true;sync();
  for(const element of media)element.pause();
  if(context&&context.state!=='closed')context.suspend().catch(()=>{});
  onStop();
 }
 function start(nextContext){
  if(doc.hidden)return false;
  if(nextContext&&!gain){
   context=nextContext;
   gain=context.createGain();gain.connect(context.destination);
   for(const element of media)context.createMediaElementSource(element).connect(gain);
  }
  inactive=false;sync();
  if(context&&context.state!=='running'&&context.state!=='closed')context.resume().catch(()=>{});
  return true;
 }
 // Embedded browsers can finish a pending play() after a page-hide event.
 for(const element of media)element.addEventListener('play',()=>{
  if(inactive||doc.hidden)stop();
 });
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop()});
 doc.addEventListener('freeze',stop);
 page.addEventListener('pagehide',stop);
 page.addEventListener('blur',stop);
 sync();
 return {start,stop,setVolume(value,isMuted=muted){
  level=Math.max(0,Math.min(1,Number(value)||0));muted=isMuted;sync();
 },get level(){return level},get inactive(){return inactive}};
}
