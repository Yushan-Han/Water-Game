export const GEOMETRY={width:560,height:1254,water:{left:66,right:488,top:175,bottom:800},pegs:[{x:205,tip:573,seat:652},{x:362,tip:573,seat:652}],radius:27,pegCapacity:7};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class WaterGame{
 constructor(seed=2006){this.seed=seed;this.reset()}
 random(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296}
 reset(){this.time=0;this.pulses=[];this.lastPump=[-1,-1];this.pressCount=0;this.events=[];this.won=false;this.rings=Array.from({length:10},(_,i)=>({id:i,color:i%5,x:100+i%5*77+(this.random()-.5)*14,y:730+Math.floor(i/5)*35,z:(this.random()-.5)*40,vx:0,vy:0,vz:0,pitch:.15+this.random()*.8,omega:0,spin:(this.random()-.5)*.6,mode:'free',peg:-1,stable:0}))}
 pump(side){if(side!==0&&side!==1)return false;if(this.time-this.lastPump[side]<.16)return false;this.lastPump[side]=this.time;this.pressCount++;this.pulses.push({side,born:this.time});this.events.push({type:'pump',side});return true}
 flow(x,y,z=0){
 let ux=0,uy=0,uz=0;
 const b=GEOMETRY.water,W=b.right-b.left,H=b.bottom-b.top,X=clamp((x-b.left)/W,0,1),Y=clamp((y-b.top)/H,0,1);
 const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t)};
 const turn=smooth((520-y)/210);
 for(const p of this.pulses){
  const age=this.time-p.born;if(age<0||age>2)continue;
  const power=(1-Math.exp(-age/.018))*Math.exp(-age/.31),h=clamp((790-y)/600,0,1);
  const origin=p.side===0?112:446,target=p.side===0?210:356,center=origin+(target-origin)*Math.min(1,h*2.4);
  const width=58+h*78+Math.min(18,age*36),dx=x-center;
  const influence=Math.exp(-dx*dx/(2*width*width)),depth=Math.exp(-z*z/(2*65*65)),core=power*influence*depth;
  const fringe=(1-influence)*Math.exp(-dx*dx/(2*145*145))*power*depth;
  let localY=-560*core*(1-.4*h)-70*fringe*(1-.3*h),localX=(target-x)*1.05*core;
  const floorFeed=Math.exp(-(((y-790)/90)**2));
  localX+=140*power*(1-influence)*floorFeed*Math.tanh((origin-x)/85)*depth;
  const wall=Math.min(1,Math.abs((x-277)/211))**3;
  localY+=42*power*(1-influence)*wall;localX+=(center-x)*power*(1-influence)*.08;
  // Streamfunction-derived closed-cell circulation: upward on the pumped side,
  // tangential flow along the lid, descending at the opposite side, floor return.
  // This is a lightweight flow approximation; the upper cell has zero normal
  // water velocity at its walls, unlike an unbounded upward plume.
  const direction=p.side===0?1:-1;
  const circulation=(1-Math.exp(-age/.07))*Math.exp(-age/.56)*.95*depth;
  const rollX=direction*175*Math.sin(Math.PI*X)*Math.cos(Math.PI*Y)*circulation;
  const rollY=-direction*175*(H/W)*Math.cos(Math.PI*X)*Math.sin(Math.PI*Y)*circulation;
  const farSide=smooth((p.side===0?X-.58:.42-X)/.28);
  const returnMix=Math.max(turn,farSide*(1-.75*floorFeed));
  ux+=localX*(1-turn)+rollX*turn;
  uy+=localY*(1-returnMix)+rollY*returnMix;
  uz-=z*core*2.6;
 }
 return{x:clamp(ux,-260,260),y:clamp(uy,-850,120),z:uz}
}
 step(dt){dt=clamp(dt,0,1/60);this.time+=dt;this.pulses=this.pulses.filter(p=>this.time-p.born<2);const b=GEOMETRY.water;
 for(const r of this.rings){r.previous={x:r.x,y:r.y,z:r.z,pitch:r.pitch,spin:r.spin};const oldY=r.y,f=this.flow(r.x,r.y,r.z);if(r.mode==='free')r.vy+=(145+3.0*(f.y-r.vy))*dt;
 if(r.mode!=='free'){const p=GEOMETRY.pegs[r.peg];r.vx=0;r.vz=0;r.x+=(p.x-r.x)*(1-Math.exp(-12*dt));r.z*=Math.exp(-12*dt);const current=Math.max(0,-f.y),wobble=Math.min(1,current/400);r.pitch+=(Math.acos(.4)+Math.sin(this.time*11+r.id)*.055*wobble-r.pitch)*(1-Math.exp(-7*dt));r.spin*=Math.exp(-7*dt);let ay=175+.95*f.y-3.7*r.vy;if(r.mode==='seated'&&ay<0)ay=Math.min(0,ay+40);r.vy+=ay*dt;r.y+=r.vy*dt;
 const below=this.rings.filter(o=>o!==r&&o.peg===r.peg&&o.mode!=='free'&&(o.y>r.y+1||(Math.abs(o.y-r.y)<=1&&o.id<r.id))),floor=p.seat-below.length*14;
 if(r.y>=floor){r.y=floor;r.vy=0;r.stable+=dt;r.mode=r.stable>.32?'seated':'threaded'}else if(r.mode!=='seated'||floor-r.y>3){r.stable=0;r.mode='threaded'}
 if(r.y<p.tip-8){r.mode='free';r.peg=-1;r.stable=0;r.vx=f.x*.2;r.omega=.4;this.events.push({type:'escape',id:r.id})}
 }else{
 r.vx+=3.1*(f.x-r.vx)*dt;r.vz+=(2.7*(f.z-r.vz)-.8*r.z)*dt;r.x+=r.vx*dt;r.y+=r.vy*dt;r.z+=r.vz*dt;r.omega+=((f.x-r.vx)*.008-(f.y-r.vy)*.0014-2.1*r.omega-1.8*(r.pitch-.85))*dt;r.pitch=clamp(r.pitch+r.omega*dt,-1.42,1.42);r.spin+=r.vx*.0009*dt;
 const rad=GEOMETRY.radius,halfH=rad*Math.max(.2,Math.abs(Math.cos(r.pitch)));
 if(r.x<b.left+rad){r.x=b.left+rad;r.vx=Math.abs(r.vx)*.2}if(r.x>b.right-rad){r.x=b.right-rad;r.vx=-Math.abs(r.vx)*.2}
 if(r.y<b.top+halfH){r.y=b.top+halfH;r.vy=Math.abs(r.vy)*.16}if(r.y>b.bottom-halfH){r.y=b.bottom-halfH;r.vy=0;r.vx*=Math.exp(-3*dt);r.omega*=Math.exp(-3*dt)}
 if(Math.abs(r.z)>34){r.z=clamp(r.z,-34,34);r.vz*=-.15}
 for(let pi=0;pi<2;pi++){const p=GEOMETRY.pegs[pi],dx=r.x-p.x,crosses=oldY<p.tip&&r.y>=p.tip,angle=Math.max(.2,Math.abs(Math.cos(r.pitch)));
 if(r.blockedPeg===pi&&this.time<r.blockedUntil)continue;
 if(crosses&&r.vy>0&&dx*dx+(r.z*.65)**2<225&&angle>.28){
  const occupied=this.rings.filter(o=>o!==r&&o.peg===pi&&o.mode!=='free').length;
  if(occupied>=GEOMETRY.pegCapacity){const direction=Math.abs(dx)>1?Math.sign(dx):(pi===0?-1:1);r.vx=direction*Math.max(135,Math.abs(r.vx));r.vy=Math.max(20,r.vy*.65);r.omega+=direction*.65;r.blockedPeg=pi;r.blockedUntil=this.time+.8;this.events.push({type:'deflect',id:r.id,peg:pi});break}
  r.mode='threaded';r.peg=pi;r.vx=0;r.vz=0;r.stable=0;this.events.push({type:'catch',id:r.id});break
 }
 if(crosses&&r.vy>0&&Math.abs(dx)<rad+5&&Math.abs(r.z)<18){r.vx+=(dx<0?-1:1)*25;r.omega+=dx<0?-.5:.5;r.vy*=.5}
 }
 }}
 for(let i=0;i<10;i++)for(let j=i+1;j<10;j++){const a=this.rings[i],c=this.rings[j];if(a.mode!=='free'||c.mode!=='free'||Math.abs(a.z-c.z)>12)continue;const dx=c.x-a.x,dy=c.y-a.y,d=Math.hypot(dx,dy),min=GEOMETRY.radius*1.12;if(d>0&&d<min){const p=(min-d)*.16,nx=dx/d,ny=dy/d;a.x-=nx*p;c.x+=nx*p;a.y-=ny*p;c.y+=ny*p;a.vx-=nx*p*4;c.vx+=nx*p*4;a.omega+=p*.015;c.omega-=p*.015}}
 for(const r of this.rings)if(r.mode==='free'){r.x=clamp(r.x,b.left+27,b.right-27);r.y=clamp(r.y,b.top+5.4,b.bottom-5.4)}
 const complete=this.score===10;if(complete&&!this.won){this.events.push({type:'win'});this.won=true}if(!complete)this.won=false
 }
 get score(){return this.rings.filter(r=>r.mode==='seated').length}
 drainEvents(){const e=this.events;this.events=[];return e}
}

