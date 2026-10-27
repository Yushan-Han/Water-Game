
const layer=document.querySelector('.tank-bubbles'),game=document.querySelector('#game');
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
const animations=new Map();
let width=0,height=0;
const random=(min,max)=>min+Math.random()*(max-min);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function launch(el,scatter=false){
 const old=animations.get(el);if(old){old.onfinish=null;old.cancel();}
 if(!width||!height)return;
 const size=random(8,17),pad=size+2,edge=Math.max(pad,width-pad);
 const x0=random(pad,edge),x1=clamp(x0+random(-.22,.22)*width,pad,edge),x2=clamp(x0+random(-.28,.28)*width,pad,edge),x3=clamp(x0+random(-.3,.3)*width,pad,edge);
 const phase=random(0,Math.PI*2),wave=random(3,10),cycles=random(.7,1.7),alpha=random(.42,.78),duration=random(8500,16500);
 el.style.width=el.style.height=size+'px';
 if(reduced.matches){
  el.style.transform='translate('+x0+'px,'+random(0,height-size)+'px)';
  el.style.opacity=String(alpha*.7);animations.delete(el);return;
 }
 el.style.opacity='';el.style.transform='';
 const frames=Array.from({length:25},(_,i)=>{
  const t=i/24,u=1-t;
  const x=clamp(u*u*u*x0+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3+Math.sin(t*Math.PI*2*cycles+phase)*wave,0,width-size);
  const y=height+size-t*(height+size*2);
  const stretch=1+Math.sin(t*12+phase)*.045;
  return {offset:t,transform:'translate('+x+'px,'+y+'px) scale('+stretch+','+(2-stretch)+')',opacity:alpha*Math.min(1,t*7,(1-t)*8)};
 });
 const motion=el.animate(frames,{duration,easing:'linear',fill:'both'});
 animations.set(el,motion);
 motion.onfinish=()=>launch(el);
 if(scatter)motion.currentTime=random(.05,.92)*duration;
 if(document.hidden||game.hidden)motion.pause();
}
function visibility(){
 for(const motion of animations.values()){
  if(document.hidden||game.hidden)motion.pause();else motion.play();
 }
}
new ResizeObserver(()=>{
 const w=layer.clientWidth,h=layer.clientHeight;
 if(!w||!h||w===width&&h===height)return;
 width=w;height=h;for(const el of layer.children)launch(el,true);
}).observe(layer);
document.addEventListener('visibilitychange',visibility);
new MutationObserver(visibility).observe(game,{attributes:true,attributeFilter:['hidden']});
reduced.addEventListener('change',()=>{for(const el of layer.children)launch(el,true)});
