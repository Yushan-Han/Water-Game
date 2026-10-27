
const random=(a,b)=>a+Math.random()*(b-a);
export function displacement(state,t){
 const decay=Math.exp(-7*t),pulse=19*t*decay;
 return {x:state.x*decay+state.dx*pulse,y:state.y*decay+state.dy*pulse+Math.sin(t*8)*state.dx*.08*pulse};
}
export function installTankNudges(onSplash){
 const world=document.querySelector('.tank-world');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 const states=new WeakMap();
 const items=world.querySelectorAll(':scope > .floating-messenger,:scope > .floating-dory,:scope > .floating-butterfly,:scope > .tank-object');
 const names=['小人','多莉鱼','蝴蝶鱼','聊天气泡','地球','电脑','绿色小鱼','小丑鱼'];
 items.forEach((el,index)=>{
  el.classList.add('tank-reactive');el.removeAttribute('aria-hidden');
  el.setAttribute('role','button');el.setAttribute('tabindex','0');el.setAttribute('aria-label','拨动'+names[index]);
  el.querySelectorAll('img').forEach(img=>img.draggable=false);
  function activate(event){
   if(event.type==='keydown'){
    if(event.key!=='Enter'&&event.key!==' ')return;
    event.preventDefault();event.stopPropagation();if(event.repeat)return;
   }
   const bounds=el.getBoundingClientRect(),scale=world.getBoundingClientRect().width/world.offsetWidth||1;
   const previous=states.get(el);let start={x:0,y:0};
   if(previous){start=displacement(previous,Math.min(1,(previous.motion.currentTime||0)/previous.duration));previous.motion.cancel();}
   const local=event.type==='click'&&event.detail>0?(bounds.left+bounds.width/2-event.clientX):random(-1,1);
   const direction=Math.abs(local)<2?(Math.random()<.5?-1:1):Math.sign(local);
   const amplitude=Math.max(18,Math.min(48,bounds.width/scale*.44))*random(.85,1.12);
   const state={x:start.x,y:start.y,dx:direction*amplitude,dy:random(-.65,.45)*amplitude,duration:random(1900,2600)};
   if(reduced.matches){state.dx*=.12;state.dy*=.12;state.duration=350;}
   const frames=Array.from({length:61},(_,i)=>{
    const p=displacement(state,i/60);
    return {offset:i/60,transform:'translate('+p.x+'px,'+p.y+'px) rotate('+(Math.sin(i/60*Math.PI)*direction*3)+'deg)'};
   });
   frames[60].transform='translate(0px,0px) rotate(0deg)';
   state.motion=el.animate(frames,{duration:state.duration,easing:'linear',composite:'add'});
   states.set(el,state);state.motion.onfinish=()=>{if(states.get(el)===state)states.delete(el)};
   Promise.resolve(onSplash()).catch(()=>{});
  }
  el.addEventListener('click',activate);el.addEventListener('keydown',activate);
 });
}
