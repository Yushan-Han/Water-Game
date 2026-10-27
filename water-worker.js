import {waterLight} from './aquarium.js?v=14';
self.onmessage=({data:{t,w,h}})=>{const pixels=waterLight(t,w,h);self.postMessage(pixels.buffer,[pixels.buffer])};
