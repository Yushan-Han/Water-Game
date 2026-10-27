import {createAudioSession} from './audio-session.js?v=27';
import {installTankNudges} from './tank-nudge.js?v=23';
import './tank-bubbles.js?v=22';
import './tank-scroll.js?v=26';
import './aquarium.js?v=14';
import {WaterGame,GEOMETRY} from './engine.js?v=10';
import {ringPose} from './render-pose.js?v=4';
const $=s=>document.querySelector(s), game=new WaterGame(), canvas=$('#scene'), ctx=canvas.getContext('2d',{alpha:true,colorSpace:'srgb'});
const images={}, sprites=[], ringLayers=Array.from({length:10},()=>{const c=document.createElement('canvas');c.width=c.height=128;return c}), active=[new Set(),new Set()], particles=[];
let ready=false,playing=false,accumulator=0,lastFrame=0,sound=true,ac,typingStart=performance.now(),loginBusy=false,winAcknowledged=false;
async function load(name,url){const im=new Image();im.src=url;await im.decode();images[name]=im;return im}
function makeSprite(color,pose){
 const cy=[177,466,755,1048,1338][color],cx=pose?719:318,rx=pose?159:137,ry=pose?80:133,w=rx*2+12,h=ry*2+12,c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');
 g.beginPath();g.ellipse(w/2,h/2,rx-1,ry-1,0,0,Math.PI*2);g.ellipse(w/2,h/2+(pose?-4:0),pose?91:67,pose?20:67,0,0,Math.PI*2);g.clip('evenodd');g.filter='saturate(.77) contrast(.94) brightness(.98) blur(.4px)';g.drawImage(images.rings,cx-w/2,cy-h/2,w,h,0,0,w,h);g.filter='none';g.globalCompositeOperation='source-atop';g.fillStyle='rgba(127,153,158,.09)';g.fillRect(0,0,w,h);return c;
}
const mobileQuery=matchMedia('(max-width:600px)');
function resizeLogin(){
 const m=mobileQuery.matches,w=m?480:1376,h=m?700:768;
 document.body.classList.toggle('mobile-login',m);
 const stage=$('#loginStage');stage.style.width=w+'px';stage.style.height=h+'px';
 stage.style.setProperty('--login-scale',m?Math.min((innerWidth-32)/w,(innerHeight-32)/h):Math.max(innerWidth/w,innerHeight/h));
 $('#loginWallpaper').src='assets/login-desktop-clean.png';
 $('#avatar').style.display='block';
}
resizeLogin();addEventListener('resize',resizeLogin);
const assetsReady=Promise.all([load('toy','assets/toy.png'),load('rings','assets/rings-p1.png'),load('portrait','assets/login-mobile.jpg')]).then(()=>{
 images.toy=prepareToy(images.toy);for(let c=0;c<5;c++)sprites.push([makeSprite(c,0),makeSprite(c,1)]);
 $('#avatar').getContext('2d').drawImage(images.portrait,164,286,292,290,0,0,330,330);ready=true;$('#enter').disabled=false;draw()
}).catch(e=>{console.error('Asset loading failed',e);throw e});$('#enter').disabled=true;
function initAudio(){if(!ac){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)ac=new Audio()}audioSession.start(ac);if(ac)loadWaterSwishBuffer().catch(()=>{})}
function tone(hz=600,duration=.12,volume=.025){if(!sound||!ac||musicMuted)return;volume*=audioSession.level;const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(hz,ac.currentTime);o.frequency.exponentialRampToValueAtTime(hz*.55,ac.currentTime+duration);g.gain.setValueAtTime(volume,ac.currentTime);g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+duration);o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+duration)}
$('#sound').onclick=()=>{sound=!sound;initAudio();$('#sound').textContent='声音 '+(sound?'开':'关');$('#sound').setAttribute('aria-pressed',sound);tone()};
$('#enter').onclick=async()=>{if(loginBusy)return;loginBusy=true;await assetsReady;initAudio();if(musicPlaying&&musicAudio.getAttribute('src'))musicAudio.play().catch(()=>{musicPlaying=false;renderMusic()});$('#loginHint').textContent='正在登录那个下午…';$('#typedUser').textContent='little_fish';$('#typedPassword').textContent='••••••';setTimeout(()=>{$('#game').hidden=false;$('#login').classList.add('leaving');playing=true;lastFrame=0;accumulator=0;setTimeout(()=>{$('#login').hidden=true;loginBusy=false},600)},500)};
function clearInput(){active.forEach(s=>s.clear());updateButtons()}
$('#back').onclick=()=>{playing=false;clearInput();$('#game').hidden=true;$('#login').hidden=false;$('#login').classList.remove('leaving');typingStart=performance.now();$('#loginHint').textContent='点击箭头进入 · 无需输入账号'};
$('#reset').onclick=()=>{game.reset();particles.length=0;winAcknowledged=false;clearInput();updateHUD();$('#status').textContent='再来一次，慢慢来。';draw()};
function updateButtons(){['leftPump','rightPump'].forEach((id,i)=>{$('#'+id).classList.toggle('active',active[i].size>0);$('#'+id).setAttribute('aria-pressed',active[i].size>0)})}
function press(side,token){if(!playing||document.querySelector('dialog[open]')||active[side].has(token))return;const first=active[side].size===0;active[side].add(token);if(first){initAudio();game.pump(side);}updateButtons()}
function release(side,token){active[side].delete(token);updateButtons()}
[0,1].forEach(side=>{const b=$(side?'#rightPump':'#leftPump');b.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(e.pointerType!=='touch')e.preventDefault();b.setPointerCapture(e.pointerId);press(side,'p'+e.pointerId)});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>release(side,'p'+e.pointerId));b.addEventListener('contextmenu',e=>e.preventDefault());b.addEventListener('click',e=>{if(e.detail===0){press(side,'accessible');setTimeout(()=>release(side,'accessible'),100)}})});
function keySide(e){return ['KeyA','ArrowLeft'].includes(e.code)?0:['KeyD','ArrowRight'].includes(e.code)?1:-1}
addEventListener('keydown',e=>{if(e.target.closest?.('.tank-scrollbar'))return;const side=keySide(e);if(side<0||!playing)return;e.preventDefault();if(!e.repeat)press(side,'k'+e.code)});
addEventListener('keyup',e=>{const side=keySide(e);if(side>=0){release(side,'k'+e.code);if(playing)e.preventDefault()}});
addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{clearInput();lastFrame=0;accumulator=0});
function showDialog(d){clearInput();d.showModal()}
$('#help').onclick=()=>showDialog($('#helpDialog'));$('.dialog-close').onclick=()=>$('#helpDialog').close();$('.dialog-close-action').onclick=()=>$('#helpDialog').close();$('#continue').onclick=()=>{$('#winDialog').close();winAcknowledged=true};
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom){d.close();if(d.id==='winDialog')winAcknowledged=true}}}));
function updateHUD(){pixelLabel($('#score'),'Rings Landed '+game.score+'/10');pixelLabel($('#pressCount'),'Presses '+game.pressCount);}
function ringDraw(r,half='full'){
 const rad=GEOMETRY.radius,pose=ringPose(r,Math.min(1,accumulator*60)),layer=ringLayers[r.id],g=layer.getContext('2d');g.clearRect(0,0,128,128);g.globalCompositeOperation='source-over';g.globalAlpha=1-pose.blend;g.drawImage(sprites[r.color][0],0,0,128,128);g.globalCompositeOperation='lighter';g.globalAlpha=pose.blend;g.drawImage(sprites[r.color][1],0,0,128,128);g.globalAlpha=1;g.globalCompositeOperation='source-over';
 ctx.save();ctx.translate(pose.x,pose.y);ctx.rotate(pose.spin);
 if(half!=='full'){ctx.beginPath();ctx.rect(-rad-4,half==='back'?-rad-4:0,rad*2+8,rad+4);ctx.clip()}
 ctx.globalAlpha=.92+Math.max(-.03,Math.min(.03,pose.z*.001));ctx.drawImage(layer,-rad,-rad*pose.ratio,rad*2,rad*2*pose.ratio);ctx.restore()
}
function pegRestore(p){
 ctx.save();ctx.beginPath();ctx.moveTo(p.x-7,573);ctx.quadraticCurveTo(p.x,566,p.x+7,574);ctx.lineTo(p.x+9,660);ctx.lineTo(p.x+27,661);ctx.lineTo(p.x+26,671);ctx.lineTo(p.x+19,675);ctx.quadraticCurveTo(p.x+16,693,p.x+7,698);ctx.lineTo(p.x+6,716);ctx.lineTo(p.x-6,716);ctx.lineTo(p.x-7,698);ctx.quadraticCurveTo(p.x-19,693,p.x-20,675);ctx.lineTo(p.x-27,671);ctx.lineTo(p.x-27,661);ctx.lineTo(p.x-9,660);ctx.closePath();ctx.clip();ctx.drawImage(images.toy,347,0,560,1254,0,0,560,1254);ctx.restore()
}
function draw(){
 if(!ready)return;ctx.clearRect(0,0,560,1254);ctx.drawImage(images.toy,347,0,560,1254,0,0,560,1254);
 ctx.save();ctx.beginPath();ctx.roundRect(65,169,425,637,18);ctx.clip();
 const free=game.rings.filter(r=>r.mode==='free'),caught=game.rings.filter(r=>r.mode!=='free').sort((a,b)=>a.y-b.y);
 free.filter(r=>r.z<0).forEach(r=>ringDraw(r));caught.forEach(r=>ringDraw(r,'back'));GEOMETRY.pegs.forEach(pegRestore);caught.forEach(r=>ringDraw(r,'front'));free.filter(r=>r.z>=0).forEach(r=>ringDraw(r));
 for(const p of particles){ctx.globalAlpha=Math.max(0,Math.min(.54,p.life*.42));ctx.strokeStyle='#eefeff';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle='rgba(194,241,255,.12)';ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x-p.r*.3,p.y-p.r*.3,1,0,Math.PI*2);ctx.fill()}
 ctx.globalAlpha=1;ctx.restore()
}
function processEvents(){for(const e of game.drainEvents()){if(e.type==='pump'){bubbleSound();for(let i=0;i<12;i++)particles.push({x:(e.side?440:115)+(Math.random()-.5)*30,y:780-Math.random()*20,vy:-75-Math.random()*65,r:2.4+Math.random()*3.0,life:1.6+Math.random()});}
 if(e.type==='catch'){tone(680,.12,.018);$('#status').textContent='穿过去了，等它落稳。'}
 if(e.type==='deflect')$('#status').textContent='这根杆子已满，试试另一根。';
 if(e.type==='escape')$('#status').textContent='又漂起来了，下一次看准时机。';
 if(e.type==='win'&&!winAcknowledged){updateWinStats();showDialog($('#winDialog'));tone(1047,.4,.03)}
}updateHUD()}
let hudClock=0;function frame(now){
 requestAnimationFrame(frame);if(!$('#login').hidden&&!loginBusy){const t=(now-typingStart)%6500,user='little_fish';$('#typedUser').textContent=t<450?'':user.slice(0,Math.min(user.length,Math.floor((t-450)/105)));$('#typedPassword').textContent=t<1900?'':'•'.repeat(Math.min(6,Math.floor((t-1900)/150)))}
 if(!playing||document.hidden||!ready||document.querySelector('dialog[open]')){lastFrame=now;accumulator=0;return}
 if(!lastFrame)lastFrame=now;accumulator+=Math.min(.1,(now-lastFrame)/1000);lastFrame=now;
 while(accumulator>=1/60){game.step(1/60);for(const p of particles){const f=game.flow(p.x,p.y);p.x+=f.x*.28/60;p.y+=(p.vy+f.y*.20)/60;p.life-=1/60}for(let i=particles.length-1;i>=0;i--)if(particles[i].life<0)particles.splice(i,1);accumulator-=1/60}
 processEvents();hudClock++;draw()
}requestAnimationFrame(frame);


/* Cut out the original white studio backdrop once; keep every gameplay coordinate. */
function removeOuterWhite(c){
 const g=c.getContext('2d'),im=g.getImageData(0,0,c.width,c.height),d=im.data,w=c.width,h=c.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let head=0,tail=0;
 const push=p=>{if(seen[p])return;seen[p]=1;const k=p*4,r=d[k],v=d[k+1],b=d[k+2];if(Math.min(r,v,b)>218&&Math.max(r,v,b)-Math.min(r,v,b)<28){queue[tail++]=p;d[k+3]=0}};
 for(let x=0;x<w;x++){push(x);push((h-1)*w+x)}for(let y=0;y<h;y++){push(y*w);push(y*w+w-1)}
 while(head<tail){const p=queue[head++],x=p%w,y=(p/w)|0;if(x)push(p-1);if(x<w-1)push(p+1);if(y)push(p-w);if(y<h-1)push(p+w)}
 g.putImageData(im,0,0);return c;
}
function prepareToy(im){
 const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;cut.getContext('2d').drawImage(im,0,0);removeOuterWhite(cut);
 const out=document.createElement('canvas');out.width=cut.width;out.height=cut.height;const g=out.getContext('2d',{colorSpace:'srgb'});g.filter='saturate(1.36) contrast(1.14) brightness(1.01)';g.drawImage(cut,0,0);return out;
}
const pixelGlyphs={
'W':['10001','10001','10001','10101','10101','11011','10001'],
'G':['01111','10000','10000','10111','10001','10001','01111'],
'R':['11110','10001','10001','11110','10100','10010','10001'],
'L':['10000','10000','10000','10000','10000','10000','11111'],
'P':['11110','10001','10001','11110','10000','10000','10000'],
'a':['00000','00000','01110','00001','01111','10001','01111'],
't':['00100','00100','11111','00100','00100','00100','00011'],
'e':['00000','00000','01110','10001','11111','10000','01111'],
'r':['00000','00000','10110','11001','10000','10000','10000'],
'm':['00000','00000','11010','10101','10101','10101','10101'],
'i':['00100','00000','01100','00100','00100','00100','01110'],
'n':['00000','00000','11110','10001','10001','10001','10001'],
'g':['00000','01111','10001','10001','01111','00001','01110'],
's':['00000','00000','01111','10000','01110','00001','11110'],
'd':['00001','00001','01111','10001','10001','10001','01111'],
'0':['01110','10001','10011','10101','11001','10001','01110'],
'1':['00100','01100','00100','00100','00100','00100','01110'],
'2':['01110','10001','00001','00010','00100','01000','11111'],
'3':['11110','00001','00001','01110','00001','00001','11110'],
'4':['00010','00110','01010','10010','11111','00010','00010'],
'5':['11111','10000','10000','11110','00001','00001','11110'],
'6':['01110','10000','10000','11110','10001','10001','01110'],
'7':['11111','00001','00010','00100','01000','01000','01000'],
'8':['01110','10001','10001','01110','10001','10001','01110'],
'9':['01110','10001','10001','01111','00001','00001','01110'],
'/':['00001','00001','00010','00100','01000','10000','10000']
};
function pixelLabel(el,label,color='currentColor'){
 if(el.dataset.value===label)return;el.dataset.value=label;el.setAttribute('aria-label',label);
 let x=0,rects='';for(const ch of label){if(ch===' '){x+=4;continue}const rows=pixelGlyphs[ch];if(rows)for(let y=0;y<7;y++)for(let n=0;n<5;n++)if(rows[y][n]==='1')rects+='<rect x="'+(x+n)+'" y="'+y+'" width="1" height="1"/>';x+=6}
 el.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+x+' 7" preserveAspectRatio="xMinYMid meet" aria-hidden="true" fill="'+color+'">'+rects+'</svg>';
}
function systemLabel(el,label){if(el.dataset.value===label)return;el.dataset.value=label;el.textContent=label;el.setAttribute('aria-label',label)}
pixelLabel($('.game-title'),'Water Game','#1711ef');updateHUD();
const musicAudio=$('#musicAudio'),musicButton=$('#musicToggle'),musicVolume=$('#musicVolume');let musicMuted=false,musicPlaying=true;
const audioSession=createAudioSession({media:[musicAudio,$('#catAudio')],onStop:()=>{
 musicPlaying=false;renderMusic();clearInput();
 for(const voice of waterSwishVoices.splice(0)){try{voice.source.stop()}catch{}}
}});
function renderMusic(){const face=$('#musicFace'),g=face.getContext('2d');g.clearRect(0,0,1254,490);if(images.musicPlayCut)g.drawImage(musicPlaying?images.musicPauseCut:images.musicPlayCut,0,0);musicButton.setAttribute('aria-label',musicPlaying?'暂停音乐':'播放音乐');musicButton.setAttribute('aria-pressed',String(musicPlaying))}
function playerCut(im,paused){
 const c=document.createElement('canvas');c.width=1254;c.height=490;const g=c.getContext('2d');g.drawImage(im,0,385,1254,490,0,0,1254,490);
 if(!paused)g.drawImage(images.musicPause,411,744,491,56,411,359,491,56);
 return removeOuterWhite(c);
}
function partData(im,x,y,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(im,x,y,w,h,0,0,w,h);return 'url("'+c.toDataURL()+'")'}
Promise.all([load('musicPlay','assets/music-play.png'),load('musicPause','assets/music-pause.png'),load('volumeParts','assets/volume-parts.png')]).then(()=>{
 images.musicPlayCut=playerCut(images.musicPlay,false);images.musicPauseCut=playerCut(images.musicPause,true);musicButton.disabled=false;musicButton.title='播放 / 暂停音乐';renderMusic();
 const s=$('.volume-control').style,im=images.volumeParts;s.setProperty('--volume-track-image',partData(im,55,361,1429,135));s.setProperty('--volume-fill-image',partData(im,459,577,433,75));s.setProperty('--volume-thumb-image',partData(im,655,751,227,90));
}).catch(e=>{console.error('Player artwork could not load',e);$('#musicMessage').textContent='播放器图片加载失败'});
musicVolume.addEventListener('input',()=>{const value=Number(musicVolume.value);$('.volume-control').style.setProperty('--volume',value+'%');if(musicMuted&&value>0){musicMuted=false;$('#musicMute').setAttribute('aria-pressed','false')}audioSession.setVolume(value/100,musicMuted);});
$('#musicMute').onclick=()=>{musicMuted=!musicMuted;audioSession.setVolume(audioSession.level,musicMuted);$('#musicMute').setAttribute('aria-pressed',String(musicMuted));$('#musicMute').setAttribute('aria-label',musicMuted?'取消静音':'静音')};
musicButton.onclick=async()=>{
 const next=!musicPlaying;
 if(!musicAudio.getAttribute('src')){musicPlaying=next;renderMusic();return}
 try{if(next){initAudio();await musicAudio.play()}else musicAudio.pause();musicPlaying=next&&!audioSession.inactive&&!document.hidden;renderMusic()}catch{musicPlaying=false;renderMusic();$('#musicMessage').textContent='音乐暂时无法播放'}
};
musicAudio.addEventListener('play',()=>{musicPlaying=!audioSession.inactive&&!document.hidden;renderMusic()});musicAudio.addEventListener('pause',()=>{musicPlaying=false;renderMusic()});
musicAudio.addEventListener('loadedmetadata',()=>{musicButton.disabled=false;musicButton.title='播放 / 暂停音乐';renderMusic()});
musicAudio.addEventListener('error',()=>{musicButton.disabled=true;musicButton.title='音乐暂时无法播放';$('#musicMessage').textContent='音乐暂时无法播放'});


let bubbleNoise;
function bubbleSound(){
 if(!sound||!ac||musicMuted||ac.state!=='running')return;
 const level=audioSession.level;if(level<=0)return;
 const t=ac.currentTime;
 if(!bubbleNoise){bubbleNoise=ac.createBuffer(1,Math.ceil(ac.sampleRate*.34),ac.sampleRate);const data=bubbleNoise.getChannelData(0);let last=0;for(let i=0;i<data.length;i++){last=last*.72+(Math.random()*2-1)*.28;data[i]=last}}
 const src=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();src.buffer=bubbleNoise;filter.type='bandpass';filter.frequency.setValueAtTime(820,t);filter.frequency.exponentialRampToValueAtTime(290,t+.29);filter.Q.value=.65;
 gain.gain.setValueAtTime(.0001,t);gain.gain.exponentialRampToValueAtTime(.34*level,t+.018);gain.gain.exponentialRampToValueAtTime(.0001,t+.32);
 src.connect(filter);filter.connect(gain);gain.connect(ac.destination);src.onended=()=>{src.disconnect();filter.disconnect();gain.disconnect()};src.start(t);src.stop(t+.34);
 for(let i=0;i<4;i++){
  const at=t+i*.045+Math.random()*.012,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(520+Math.random()*340,at);o.frequency.exponentialRampToValueAtTime(140+Math.random()*100,at+.105);
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime((.16+Math.random()*.07)*level,at+.008);g.gain.exponentialRampToValueAtTime(.0001,at+.115);o.connect(g);g.connect(ac.destination);o.onended=()=>{o.disconnect();g.disconnect()};o.start(at);o.stop(at+.125);
 }
}


function updateWinStats(){
 $('#winRings').textContent=game.score+' / 10';$('#winPresses').textContent=game.pressCount;
 const seconds=Math.floor(game.time);$('#winTime').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');
}
Object.assign(pixelGlyphs,{'A':['01110','10001','10001','11111','10001','10001','10001'],'l':['01100','00100','00100','00100','00100','00100','01110'],'!':['00100','00100','00100','00100','00100','00000','00100']});
pixelLabel($('#winHeading'),'All rings landed!','#202020');
$('#winClose').onclick=()=>{$('#winDialog').close();winAcknowledged=true};
$('#winDialog').addEventListener('close',()=>{winAcknowledged=true});

// Reuse the photo's own pixels, removing only its connected white studio backdrop.
load('butterfly','assets/butterfly-fish.png').then(im=>{
 const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);
 const pixels=g.getImageData(0,0,cut.width,cut.height).data;let left=cut.width,top=cut.height,right=0,bottom=0;
 for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(pixels[(y*cut.width+x)*4+3]>64){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y)}
 if(right<left)return;const out=$('#butterflyFish');out.width=right-left+1;out.height=bottom-top+1;out.getContext('2d').drawImage(cut,left,top,out.width,out.height,0,0,out.width,out.height);
}).catch(e=>console.error('Decorative fish could not load',e));

Object.assign(pixelGlyphs,{'K':['10001','10010','10100','11000','10100','10010','10001'],'p':['00000','11110','10001','10001','11110','10000','10000'],'y':['00000','10001','10001','10001','01111','00001','01110']});
pixelLabel($('#continue'),'Keep playing','#252525');
for(const el of [$('#winHeading'),$('#continue')])el.querySelector('svg').setAttribute('preserveAspectRatio','xMidYMid meet');
const catAudio=$('#catAudio');
function syncCatAudio(){audioSession.setVolume(audioSession.level,musicMuted)}
const catVariations=[1,.83,1.21];
catAudio.preservesPitch=false;catAudio.webkitPreservesPitch=false;
$('#catButton').onclick=()=>{initAudio();syncCatAudio();catAudio.currentTime=0;catAudio.playbackRate=catVariations[Math.floor(Math.random()*catVariations.length)];catAudio.play().catch(()=>{$('#musicMessage').textContent='猫咪音效暂时无法播放'})};
musicVolume.addEventListener('input',syncCatAudio);$('#musicMute').addEventListener('click',syncCatAudio);syncCatAudio();

// Each supplied decoration is mounted once; reuse the existing butterfly.
load('tank-chat','assets/tank-chat.png').then(im=>{const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);const d=g.getImageData(0,0,cut.width,cut.height).data;let l=cut.width,t=cut.height,r=-1,b=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(d[(y*cut.width+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}if(r<l)return;const out=$('#tank-chat');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(cut,l,t,out.width,out.height,0,0,out.width,out.height)}).catch(e=>console.error('Tank decoration could not load',e));
load('tank-globe','assets/tank-globe.jpg').then(im=>{const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);const d=g.getImageData(0,0,cut.width,cut.height).data;let l=cut.width,t=cut.height,r=-1,b=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(d[(y*cut.width+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}if(r<l)return;const out=$('#tank-globe');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(cut,l,t,out.width,out.height,0,0,out.width,out.height)}).catch(e=>console.error('Tank decoration could not load',e));
load('tank-computer','assets/tank-computer.png').then(im=>{const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);const d=g.getImageData(0,0,cut.width,cut.height).data;let l=cut.width,t=cut.height,r=-1,b=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(d[(y*cut.width+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}if(r<l)return;const out=$('#tank-computer');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(cut,l,t,out.width,out.height,0,0,out.width,out.height)}).catch(e=>console.error('Tank decoration could not load',e));
load('tank-green-fish','assets/tank-green-fish.png').then(im=>{const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);const d=g.getImageData(0,0,cut.width,cut.height).data;let l=cut.width,t=cut.height,r=-1,b=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(d[(y*cut.width+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}if(r<l)return;const out=$('#tank-green-fish');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(cut,l,t,out.width,out.height,0,0,out.width,out.height)}).catch(e=>console.error('Tank decoration could not load',e));
load('tank-clownfish','assets/tank-clownfish.png').then(im=>{const cut=document.createElement('canvas');cut.width=im.naturalWidth;cut.height=im.naturalHeight;const g=cut.getContext('2d');g.drawImage(im,0,0);removeOuterWhite(cut);const d=g.getImageData(0,0,cut.width,cut.height).data;let l=cut.width,t=cut.height,r=-1,b=-1;for(let y=0;y<cut.height;y++)for(let x=0;x<cut.width;x++)if(d[(y*cut.width+x)*4+3]>32){l=Math.min(l,x);t=Math.min(t,y);r=Math.max(r,x);b=Math.max(b,y)}if(r<l)return;const out=$('#tank-clownfish');out.width=r-l+1;out.height=b-t+1;out.getContext('2d').drawImage(cut,l,t,out.width,out.height,0,0,out.width,out.height)}).catch(e=>console.error('Tank decoration could not load',e));

let waterSwishBuffer,waterSwishMaster,waterSwishDecode;const waterSwishVoices=[];
const waterSwishBytes=fetch('assets/hand-water-real.wav').then(response=>{if(!response.ok)throw Error('Water sound could not load');return response.arrayBuffer()}).catch(()=>null);
function loadWaterSwishBuffer(){
 if(!ac)return Promise.resolve(null);
 if(!waterSwishDecode)waterSwishDecode=waterSwishBytes.then(bytes=>bytes?ac.decodeAudioData(bytes.slice(0)):null).then(buffer=>(waterSwishBuffer=buffer));
 return waterSwishDecode;
}
function syncWaterSwishVolume(){if(waterSwishMaster)waterSwishMaster.gain.value=sound&&!musicMuted?audioSession.level:0}
async function waterSwishSound(){
 if(!sound||!ac||musicMuted||audioSession.level<=0)return;
 const buffer=waterSwishBuffer||await loadWaterSwishBuffer();
 if(!buffer||!sound||musicMuted||audioSession.level<=0||ac.state!=='running')return;
 if(!waterSwishMaster){waterSwishMaster=ac.createGain();waterSwishMaster.connect(ac.destination)}
 syncWaterSwishVolume();
 const t=ac.currentTime,source=ac.createBufferSource(),envelope=ac.createGain(),duration=buffer.duration;
 source.buffer=buffer;source.playbackRate.value=1;
 envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(1,t+.008);envelope.gain.setValueAtTime(1,t+Math.max(.008,duration-.016));envelope.gain.exponentialRampToValueAtTime(.0001,t+duration);
 source.connect(envelope);envelope.connect(waterSwishMaster);
 const voice={source,envelope};waterSwishVoices.push(voice);
 source.onended=()=>{source.disconnect();envelope.disconnect();const i=waterSwishVoices.indexOf(voice);if(i>=0)waterSwishVoices.splice(i,1)};
 if(waterSwishVoices.length>3){const old=waterSwishVoices.shift();old.envelope.gain.cancelScheduledValues(t);old.envelope.gain.setTargetAtTime(.0001,t,.012);old.source.stop(t+.05)}
 source.start(t);source.stop(t+duration+.01);
}
musicVolume.addEventListener('input',syncWaterSwishVolume);
$('#musicMute').addEventListener('click',syncWaterSwishVolume);
$('#sound').addEventListener('click',syncWaterSwishVolume);
installTankNudges(async()=>{initAudio();if(ac?.state==='suspended')await ac.resume();await waterSwishSound()});
