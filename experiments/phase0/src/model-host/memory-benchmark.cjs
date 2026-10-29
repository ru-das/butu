const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'../../../..');
const fixture=path.join(os.tmpdir(),'butu-memory-fixture');
const chromeExecutable=process.env.BUTU_CHROME;
if(!chromeExecutable)throw Error('Set BUTU_CHROME to a Chrome for Testing executable');
// Only the temporary fixture changes; the normal Phase 0 host is preserved.
fs.cpSync(path.join(root,'experiments/phase0/chrome'),fixture,{recursive:true});
const offscreen=path.join(fixture,'src/model-host/offscreen.html');
fs.writeFileSync(offscreen,fs.readFileSync(offscreen,'utf8').replace('../../background.js','./memory-host.js'));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const out=process.env.BUTU_MEMORY_RESULTS??path.join(os.tmpdir(),'butu-memory-results');fs.mkdirSync(out,{recursive:true});
const cases=[
 {name:'selected-defaults',embedding:true,text:true,tokens:25},
 {name:'flan-t5-text-25',text:true,textCandidate:true,tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'minilm-l3-embedding',embedding:true,embeddingCandidate:true,worker:true,idleDelays:[5000,10000,15000]},
 {name:'flan-t5-quality',text:true,textCandidate:true,textSuite:true,tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'baseline-q4-quality',text:true,textBaseline:true,textSuite:true,tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'minilm-l3-quality',embedding:true,embeddingCandidate:true,embeddingSuite:true,worker:true,idleDelays:[5000,10000,15000]},
 {name:'baseline-l6-quality',embedding:true,embeddingBaseline:true,embeddingSuite:true,worker:true,idleDelays:[5000,10000,15000]},
 {name:'smollm-q8-text-25',text:true,textCandidate:'smollm-q8',tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'smollm-q8-quality',text:true,textCandidate:'smollm-q8',textSuite:true,tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'paired-output-length',textBaseline:true,text:true,tokens:48,tokenRuns:[48,25,48,25,48,25]},
 {name:'worker-text-25-long-idle',textBaseline:true,text:true,tokens:25,worker:true,idleDelays:[5000,10000,15000]},
 {name:'embedding-only',embeddingBaseline:true,embedding:true},
 {name:'text-48',textBaseline:true,text:true,tokens:48},
 {name:'sequential-48',embeddingBaseline:true,textBaseline:true,embedding:true,text:true,tokens:48},
 {name:'text-basic-48',textBaseline:true,text:true,tokens:48,sessionOptions:{graphOptimizationLevel:'basic'}},
 {name:'text-no-prepack-48',textBaseline:true,text:true,tokens:48,sessionOptions:{extra:{session:{disable_prepacking:'1'}}}},
 {name:'text-25',textBaseline:true,text:true,tokens:25},
 {name:'worker-text-25',textBaseline:true,text:true,tokens:25,worker:true},
];
async function connect(url,onEvent=()=>{}){
 const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let seq=0;const pending=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);if(!p)return;pending.delete(m.id);m.error?p.reject(m.error):p.resolve(m.result)}else onEvent(m)};
 return {call(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))})},close(){ws.close()}};
}
async function bench(options){
 const result={options,phases:[],peakRssKiB:0,peakPrivateKiB:0};const jobs=[];
 const log=fs.openSync(`${out}/${options.name}.log`,'w');
 const proc=spawn(chromeExecutable,['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--enable-unsafe-extension-debugging','--offscreen-document-testing',`--user-data-dir=${path.join(os.tmpdir(),'butu-memory-chrome-profile')}`,'--remote-debugging-port=9347','about:blank'],{stdio:['ignore',log,log]});
 let browser,page,sampling=false,sampler;
 const save=()=>fs.writeFileSync(`${out}/${options.name}.json`,JSON.stringify(result,null,2));
 try{
 let version;for(let i=0;i<60;i++){try{version=await(await fetch('http://127.0.0.1:9347/json/version')).json();break}catch{await pause(500)}}
 if(!version)throw Error('No CDP');result.browser=version.Browser;
 const candidate=await connect(version.webSocketDebuggerUrl);
 const identity=await candidate.call('SystemInfo.getProcessInfo');
 if(!identity.processInfo.some(p=>p.type==='browser'&&p.id===proc.pid)){candidate.close();throw Error('Debug port belongs to another browser')}
 browser=candidate;
 async function snapshot(){
 const {processInfo}=await browser.call('SystemInfo.getProcessInfo');const processes=[];
 for(const p of processInfo.filter(p=>p.type==='renderer')){
 try{
 const cmdline=fs.readFileSync(`/proc/${p.id}/cmdline`,'utf8');if(!cmdline.includes('--extension-process'))continue;
 const status=fs.readFileSync(`/proc/${p.id}/status`,'utf8');const smaps=fs.readFileSync(`/proc/${p.id}/smaps_rollup`,'utf8');
 const field=(s,key)=>Number(s.match(new RegExp(`^${key}:\\s+(\\d+)`,'m'))?.[1]??0);
 processes.push({pid:p.id,rssKiB:field(status,'VmRSS'),highWaterKiB:field(status,'VmHWM'),privateKiB:field(smaps,'Private_Clean')+field(smaps,'Private_Dirty'),swapKiB:field(smaps,'Swap'),cpuTime:p.cpuTime});
 }catch{}
 }
 const memory={rssKiB:processes.reduce((s,p)=>s+p.rssKiB,0),privateKiB:processes.reduce((s,p)=>s+p.privateKiB,0),processes};
 result.peakRendererHwmKiB=Math.max(result.peakRendererHwmKiB??0,...processes.map(p=>p.highWaterKiB));result.peakRssKiB=Math.max(result.peakRssKiB,memory.rssKiB);result.peakPrivateKiB=Math.max(result.peakPrivateKiB,memory.privateKiB);return memory;
 }
 await browser.call('Extensions.loadUnpacked',{path:fixture});
 let target;for(let i=0;i<60;i++){const list=await(await fetch('http://127.0.0.1:9347/json/list')).json();target=list.find(t=>t.url.endsWith('/src/model-host/offscreen.html'));if(target)break;await pause(500)}
 if(!target)throw Error('No offscreen');let done=false,failed=false;
 page=await connect(target.webSocketDebuggerUrl,m=>{
 if(m.method==='Runtime.consoleAPICalled'&&m.params.args[0]?.value==='[memory]'){
 const event=JSON.parse(m.params.args[1].value);console.log(options.name,event.phase,event.loadMs??event.generationMs??'');
 jobs.push(snapshot().then(memory=>{result.phases.push({...event,memory});save()}));
 if(event.phase==='settled')done=true;if(event.phase==='error')failed=true;
 }
 if(m.method==='Runtime.exceptionThrown'){result.exception=m.params;failed=true;}
 });
 await page.call('Runtime.enable');
 for(let i=0;i<50;i++){const r=await page.call('Runtime.evaluate',{expression:'typeof startMemoryCase'});if(r.result.value==='function')break;await pause(200)}
 sampling=true;sampler=(async()=>{while(sampling){await snapshot();await pause(500)}})();
 await page.call('Runtime.evaluate',{expression:`startMemoryCase(${JSON.stringify(options)})`});
 const deadline=Date.now()+300000;while(!done&&!failed&&Date.now()<deadline)await pause(500);
 if(!done&&!failed)result.timeout=true;
 await Promise.all(jobs);
 await page.call('HeapProfiler.collectGarbage');await pause(1000);result.afterForcedGC=await snapshot();
 result.pass=done&&!failed&&result.peakRendererHwmKiB>0;save();
 console.log('RESULT',options.name,JSON.stringify({pass:result.pass,peakRssMiB:result.peakRssKiB/1024,peakPrivateMiB:result.peakPrivateKiB/1024,afterGcMiB:result.afterForcedGC.rssKiB/1024}));
 }catch(error){result.error=String(error);save();console.log('ERROR',options.name,String(error))}
 finally{
 sampling=false;if(sampler)await sampler.catch(()=>{});if(page)page.close();
 if(browser){await Promise.race([browser.call('Browser.close').catch(()=>{}),pause(2000)]);browser.close()}
 if(proc.exitCode===null)proc.kill();await pause(2000);fs.closeSync(log);
 }
 return result;
}
(async()=>{const selected=process.argv.slice(2);if(selected.some(name=>!cases.some(c=>c.name===name)))throw Error('Unknown case; use '+cases.map(c=>c.name).join(', '));for(const c of cases.filter(c=>!selected.length||selected.includes(c.name))){const result=await bench(c);if(!result.pass)process.exitCode=1}})().catch(e=>{console.error(e);process.exitCode=1});
