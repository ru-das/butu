import {runCase} from './memory-runner.js';
globalThis.memoryEvents=[];
globalThis.startMemoryCase=async options=>{
 const emit=event=>{memoryEvents.push(event);console.log('[memory]',JSON.stringify(event))};
 try{
 if(options.worker){
 await new Promise((resolve,reject)=>{
 const worker=new Worker(new URL('./memory-worker.js',import.meta.url),{type:'module'});
 worker.onerror=event=>{worker.terminate();reject(Error(event.message))};
 worker.onmessage=async({data})=>{
 emit(data);
 if(data.phase==='error'){worker.terminate();reject(Error(data.error))}
 if(data.phase==='done'){worker.terminate();emit({phase:'worker-terminated'});for(const delay of options.idleDelays??[5000]){await new Promise(r=>setTimeout(r,delay));emit({phase:'idle',delay})}emit({phase:'settled'});resolve()}
 };
 worker.postMessage(options);
 });
 }else{await runCase(options,emit);await new Promise(r=>setTimeout(r,5000));emit({phase:'settled'})}
 }catch(error){emit({phase:'error',error:String(error),stack:error.stack})}
};
