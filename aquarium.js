// The surface is a sum of non-aligned travelling waves. Forward ray projection
// makes light gather and separate naturally instead of translating a drawn mesh.
export function waterLight(t,width=320,height=168){
 const field=new Float32Array(width*height),pixels=new Uint8ClampedArray(width*height*4),waves=[
 [.043,.28,2.4,.37,.4],[.068,1.63,1.6,-.31,2.1],[.097,2.54,.85,.48,4.3],[.139,.94,.43,-.62,1.2],[.183,2.07,.25,.73,5.2],[.251,-.46,.12,-.84,3.1]
 ].map(([k,a,amp,speed,phase])=>({x:k*Math.cos(a),y:k*Math.sin(a),amp,speed,phase}));
 const step=1;
 for(let y=-24;y<height+24;y+=step)for(let x=-24;x<width+24;x+=step){
  const wx=x+13*Math.sin(.019*x+.027*y+t*.13)+7*Math.sin(.043*y-t*.22),wy=y+9*Math.sin(.023*x-.018*y-t*.11)+5*Math.sin(.046*x+t*.19);
  let nx=0,ny=0;for(const w of waves){const slope=w.amp*Math.cos(w.x*wx+w.y*wy+w.speed*t+w.phase);nx+=w.x*slope;ny+=w.y*slope}
  const px=x-nx*70,py=y-ny*70,ix=Math.floor(px),iy=Math.floor(py);if(ix<0||iy<0||ix>=width-1||iy>=height-1)continue;
  const fx=px-ix,fy=py-iy,p=iy*width+ix;field[p]+=(1-fx)*(1-fy);field[p+1]+=fx*(1-fy);field[p+width]+=(1-fx)*fy;field[p+width+1]+=fx*fy;
 }
 for(let i=0;i<field.length;i++){const light=Math.max(0,field[i]*step*step-1.05),strength=1-Math.exp(-light*.72),p=i*4;pixels[p]=224;pixels[p+1]=252;pixels[p+2]=255;pixels[p+3]=Math.round(strength*172)}
 return pixels;
}
const canvas=typeof document==='undefined'?null:document.querySelector('#waterOptics');
if(canvas){
 const w=256,h=136,off=document.createElement('canvas');off.width=w;off.height=h;canvas.width=w;canvas.height=h;
 const g=off.getContext('2d'),ctx=canvas.getContext('2d'),frame=g.createImageData(w,h),reduced=matchMedia('(prefers-reduced-motion:reduce)');let last=-Infinity,drawn=false,pending=false,worker;
 function display(pixels){pending=false;if(document.hidden)return;frame.data.set(pixels);g.putImageData(frame,0,0);ctx.clearRect(0,0,w,h);ctx.filter='blur(1.15px)';ctx.drawImage(off,0,0);drawn=true}
 try{worker=new Worker(new URL('./water-worker.js',import.meta.url),{type:'module'});worker.onmessage=e=>display(new Uint8ClampedArray(e.data));worker.onerror=()=>{worker.terminate();worker=null;pending=false}}catch{}
 function paint(now){requestAnimationFrame(paint);if(document.hidden||document.querySelector('#game').hidden||now-last<100||pending||(reduced.matches&&drawn)||(!worker&&drawn))return;last=now;pending=true;if(worker)worker.postMessage({t:now*.001,w,h});else display(waterLight(now*.001,w,h))}
 requestAnimationFrame(paint);
}
