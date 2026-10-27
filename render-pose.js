const clampPose=(v,a,b)=>Math.max(a,Math.min(b,v));
export function ringPose(r,alpha=1){const p=r.previous||r,t=clampPose(alpha,0,1),lerp=k=>p[k]+(r[k]-p[k])*t,ratio=Math.max(.25,Math.abs(Math.cos(lerp('pitch')))),u=clampPose((.82-ratio)/.34,0,1);return{x:lerp('x'),y:lerp('y'),z:lerp('z'),spin:lerp('spin'),ratio,blend:u*u*(3-2*u)}}
