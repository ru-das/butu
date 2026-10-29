import {runCase} from './memory-runner.js';
self.onmessage=async({data})=>{try{await runCase(data,event=>postMessage(event))}catch(error){postMessage({phase:'error',error:String(error),stack:error.stack})}};
