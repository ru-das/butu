const fs=require('node:fs'),net=require('node:net'),{spawn}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..'),out=root+'/.local-reports/v5/run-'+Date.now();fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const p=new Map();ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const q=p.get(m.id);p.delete(m.id);m.error?q.j(Error(JSON.stringify(m.error))):q.r(m.result)}};return{call:(method,params={})=>new Promise((r,j)=>{p.set(++id,{r,j});ws.send(JSON.stringify({id,method,params}))}),close:()=>ws.close()};}
async function marionette(port){let socket;for(let i=0;i<300;i++){try{socket=await new Promise((r,j)=>{const s=net.connect(port,'127.0.0.1',()=>r(s));s.on('error',j)});break}catch{await sleep(200)}}if(!socket)throw Error('Firefox timeout');let b=Buffer.alloc(0),p=[],g;const greeting=new Promise(r=>g=r);socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);while(true){const colon=b.indexOf(58);if(colon<0)return;const n=Number(b.subarray(0,colon));if(b.length<colon+1+n)return;const m=JSON.parse(b.subarray(colon+1,colon+1+n));b=b.subarray(colon+1+n);if(!Array.isArray(m)){g(m);continue}const q=p.shift();m[2]?q.j(Error(JSON.stringify(m[2]))):q.r(m[3])}});await greeting;let id=0;return{call:(name,args={})=>new Promise((r,j)=>{p.push({r,j});const d=Buffer.from(JSON.stringify([0,++id,name,args]));socket.write(Buffer.concat([Buffer.from(d.length+':'),d]))}),close:()=>socket.end()};}
const http = require('node:http');
const probe = `
import { VoiceQueue } from '../voice.js';
const clips = [], transitions = [], crossfades = [];
const sampled = new Set();
let current;
const update = VoiceQueue.prototype.update;
VoiceQueue.prototype.update = function(state) {
 current = this;
 if(this.state.stage !== state.stage || this.state.visit !== state.visit || this.state.volume !== state.volume)
  transitions.push({at:Date.now(),stage:state.stage,visit:state.visit,volume:state.volume});
 return update.call(this,state);
};
const play = VoiceQueue.prototype.play;
VoiceQueue.prototype.play = function(path,...args) {
 const p=play.call(this,path,...args);
 if(p) {
  const entry={path,at:Date.now(),events:[],player:p};clips.push(entry);
  for(const event of ['playing','ended','error'])p.audio.addEventListener(event,()=>entry.events.push({event,time:p.audio.currentTime,at:Date.now()}));
 }
 return p;
};
// Sample in the host: a remote snapshot can land on the exact first sample
// of playback (gain zero), or arrive after a short crossfade has finished.
setInterval(()=>{
 if(!current)return;
 const music=clips.filter(c=>c.path.startsWith('music-box/')&&current.players.has(c.player));
 const key=music.map(c=>c.path).join('|');
 if(music.length===2&&!sampled.has(key)&&music.every(c=>c.player.gain.gain.value>0&&c.player.gain.gain.value<0.25)) {
  sampled.add(key);crossfades.push({at:Date.now(),paths:music.map(c=>c.path),gains:music.map(c=>c.player.gain.gain.value)});
 }
},20);
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(m.type!=='v5:snapshot'||s.id!==chrome.runtime.id)return;
 reply({context:current?.context?.state??null,players:current?.players.size??0,
  transitions, crossfades, clips:clips.map(({player:p,...entry})=>({...entry,currentTime:p.audio.currentTime,loop:p.audio.loop,
   gain:p.gain.gain.value,retiring:!!p.retiring,active:current.players.has(p)}))});
});
`;
function fixture(browser) {
 const dest=out+'/'+browser+'-extension';fs.cpSync(root+'/dist/'+browser,dest,{recursive:true});
 fs.writeFileSync(dest+'/src/model-host/v5-probe.js',probe);
 const entry=dest+'/src/'+(browser==='chrome'?'model-host/offscreen.js':'background.js');
 fs.writeFileSync(entry,"import '"+(browser==='chrome'?'./v5-probe.js':'./model-host/v5-probe.js')+"';\n"+fs.readFileSync(entry,'utf8'));
 return dest;
}
async function scenario(name,E) {
 const result={browser:name,checks:[],startedAt:Date.now()};
 const save=()=>fs.writeFileSync(out+'/'+name+'.json',JSON.stringify(result,null,2));
 function check(label,ok,detail){result.checks.push({label,pass:!!ok,detail});save();console.log(name,label,ok?'PASS':'FAIL');if(!ok)throw Error(label+' '+JSON.stringify(detail));}
 const send=async(type)=>E(`return await new Promise(r=>chrome.runtime.sendMessage({type:'${type}'},r));`);
 const snapshot=()=>send('v5:snapshot');
 await E(`await new Promise(r=>chrome.storage.local.set({allowlist:['localhost'],blocklist:['127.0.0.1'],volume:0.25,muted:false},r));return true;`);
 await E(`return await new Promise(r=>chrome.runtime.sendMessage({type:'session:start',task:'Study database systems',minutes:10},r));`);
 const work=await E(`return await new Promise(r=>chrome.tabs.create({url:'http://localhost:8789/work',active:false},r));`);
 const page=await E(`return await new Promise(r=>chrome.tabs.create({url:'http://127.0.0.1:8789/drift',active:true},r));`);
 await E(`return await new Promise(r=>chrome.windows.update(${page.windowId},{focused:true},r));`);
 await sleep(2500);
 const baseline=await E(`return await new Promise(r=>chrome.storage.local.get(['session','offTaskTiming'],r));`);
 check('foreground off-task visit detected',baseline.offTaskTiming?.activeTabId===page.id&&baseline.offTaskTiming.tabs[page.id].onTask===false,baseline);
 const recLog=fs.openSync(out+'/'+name+'-record.log','w');
 const recording=spawn('ffmpeg',['-hide_banner','-y','-f','pulse','-i','alsa_output.pci-0000_00_1f.3.analog-stereo.monitor','-ac','1','-ar','16000',out+'/'+name+'.wav'],{stdio:['ignore',recLog,recLog]});
 async function seed(seconds) {
  // Activation and timing writes share a background queue. Wait for the test
  // timestamp to survive a tick so an in-flight write cannot overwrite it.
  for(let attempt=0;attempt<5;attempt++) {
   await E(`const d=await new Promise(r=>chrome.storage.local.get('offTaskTiming',r));const t=d.offTaskTiming;t.tabs[${page.id}].seconds=${seconds};t.updatedAt=Date.now();await new Promise(r=>chrome.storage.local.set({offTaskTiming:t},r));await new Promise(r=>chrome.tabs.sendMessage(${page.id},{type:'timing:poll'},r));return true;`);
   await sleep(1500);
   const actual=await E(`const d=await new Promise(r=>chrome.storage.local.get('offTaskTiming',r));return d.offTaskTiming.tabs[${page.id}].seconds;`);
   if(actual>=seconds&&actual<seconds+10)return;
  }
  throw Error('Could not stabilize stage timing fixture');
 }

 try {
  const windows=[];
  for(const [stage,seconds,wait] of [[1,16,4500],[2,46,6500],[3,91,9000],[4,181,65000]]){
   const at=Date.now();await seed(seconds);
   await sleep(600);
   await sleep(wait-600);
   let s=await snapshot();
   for(let attempt=0;attempt<15&&!s.clips.some(c=>c.path.startsWith('music-box/stage-'+stage)&&c.events.some(e=>e.event==='playing'));attempt++){await sleep(1000);s=await snapshot();}
   windows.push({stage,at,until:Date.now()});
   if(stage>1)check('stage '+stage+' music crossfade has two intermediate gains',s.crossfades.some(c=>c.paths.some(p=>p.startsWith('music-box/stage-'+stage))),s.crossfades);
   check('stage '+stage+' native audio plays',s.clips.some(c=>c.path.startsWith('music-box/stage-'+stage)&&c.events.some(e=>e.event==='playing')),s);
   check('audio context running at stage '+stage,s.context==='running',s.context);
   if(stage>=2)check('whisper '+stage+' once',s.clips.filter(c=>c.path==='voice/'+({2:'butu-06',3:'butu-08',4:'butu-12'}[stage])).length===1&&s.clips.filter(c=>c.path.startsWith('voice/')).every(c=>c.events.some(e=>e.event==='playing')),s.clips);
   if(stage===4)check('winding-down ends without looping after 35 seconds of silence',s.clips.filter(c=>c.path.includes('stage-4')).length===1&&s.clips.find(c=>c.path.includes('stage-4')).events.some(e=>e.event==='ended')&&!s.clips.find(c=>c.path.includes('stage-4')).loop,s.clips);
  }
  await E(`return await new Promise(r=>chrome.tabs.update(${work.id},{active:true},r));`);await sleep(3500);
  let s=await snapshot();
  check('return chime plays once',s.clips.filter(c=>c.path==='sfx/happy-return-chime').length===1&&s.clips.find(c=>c.path==='sfx/happy-return-chime').events.some(e=>e.event==='playing'),s);
  check('return fades all haunting players',s.players===0,s.players);
  await E(`return await new Promise(r=>chrome.tabs.update(${page.id},{active:true},r));`);await seed(46);await sleep(4500);
  s=await snapshot();check('same visit does not repeat first whisper',s.clips.filter(c=>c.path==='voice/butu-06').length===1,s);
  await E(`await new Promise(r=>chrome.storage.local.set({muted:true},r));return true;`);await sleep(2500);
  check('mute releases audio players',(await snapshot()).players===0);
  await E(`await new Promise(r=>chrome.storage.local.set({muted:false},r));return true;`);await sleep(2500);
  check('unmute resumes music',(await snapshot()).clips.some(c=>c.active&&c.path.startsWith('music-box/')));
  await E(`return await new Promise(r=>chrome.tabs.reload(${page.id},{},r));`);await sleep(6000);
  s=await snapshot();check('same-URL reload permits one new whisper',s.clips.filter(c=>c.path==='voice/butu-06').length===2,s);
  await send('session:stop');await sleep(3000);s=await snapshot();
  check('session end releases players and audio context',s.players===0&&s.context===null,s);
  result.windows=windows;result.audio=s;result.endedAt=Date.now();save();
 }finally{recording.kill('SIGINT');await new Promise(r=>recording.on('exit',r));fs.closeSync(recLog);}
}
async function chromeRun(){
 const profile=out+'/chrome-profile',log=fs.openSync(out+'/chrome.log','w');
 const child=spawn(process.env.BUTU_CHROME || (fs.existsSync(process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome') ? process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' : 'chromium'),['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'--remote-debugging-port=0','about:blank'],{stdio:['ignore',log,log]});
 let browser,view;
 try{
  let port,version;for(let i=0;i<100;i++){try{port=fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();browser=await connect(version.webSocketDebuggerUrl);break}catch{await sleep(200)}}
  if(!browser)throw Error('Chrome timeout');
  const{id}=await browser.call('Extensions.loadUnpacked',{path:fixture('chrome')});
  const{targetId}=await browser.call('Target.createTarget',{url:'chrome-extension://'+id+'/src/popup/popup.html'});
  const ts=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();view=await connect(ts.find(t=>t.id===targetId).webSocketDebuggerUrl);await sleep(1000);
  const E=async code=>{const r=await view.call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await scenario(version.Browser.replace('/','-'),E);
 }finally{view?.close();if(browser){await browser.call('Browser.close').catch(()=>{});browser.close()}child.kill();fs.closeSync(log)}
}
async function firefoxRun(){
 const profile=out+'/firefox-profile';fs.mkdirSync(profile);fs.writeFileSync(profile+'/user.js','user_pref("marionette.port",2887);\nuser_pref("browser.shell.checkDefaultBrowser",false);\n');
 const log=fs.openSync(out+'/firefox.log','w');const child=spawn(process.env.BUTU_FIREFOX || 'firefox',['--headless','--no-remote','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],{stdio:['ignore',log,log]});let m;
 try{
  m=await marionette(2887);const session=await m.call('WebDriver:NewSession',{capabilities:{}});
  await m.call('WebDriver:SetTimeouts',{script:30000,pageLoad:30000});await m.call('Addon:Install',{path:fixture('firefox'),temporary:true});
  await m.call('Marionette:SetContext',{value:'chrome'});const{value:url}=await m.call('WebDriver:ExecuteScript',{script:"return WebExtensionPolicy.getByID('butu@butu.test').getURL('src/popup/popup.html');",args:[]});
  await m.call('Marionette:SetContext',{value:'content'});await m.call('WebDriver:Navigate',{url});
  const E=async code=>{const r=await m.call('WebDriver:ExecuteAsyncScript',{script:'const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(value=>done({value}),e=>done({error:String(e)}));',args:[],newSandbox:false});if(r.value.error)throw Error(r.value.error);return r.value.value;};
  await scenario('Firefox-'+session.capabilities.browserVersion,E);
 }finally{m?.close();child.kill();fs.closeSync(log)}
}
(async()=>{
 console.log('Evidence: '+out);
 const server=http.createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Database systems</title><h1>Database systems</h1><p>Local V5 playback fixture.</p>')});
 await new Promise(r=>server.listen(8789,'0.0.0.0',r));
 try{if(process.argv[2]!=='firefox')await chromeRun();if(process.argv[2]!=='chrome')await firefoxRun();}finally{server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
