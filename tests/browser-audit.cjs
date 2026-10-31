// Installed-extension audit. Diagnostic copies and fresh profiles stay under .local-reports.
const fs = require('node:fs'), net = require('node:net'), { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = require('node:path').resolve(__dirname, '..');
const out = process.env.BUTU_AUDIT_RESULTS ?? root + '/.local-reports/audit/run-' + Date.now();
fs.mkdirSync(out, { recursive: true });
const full = process.argv.includes('--full');
const fixturePort=Number(process.env.BUTU_AUDIT_PORT??8789);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function connect(url) {
 const ws = new WebSocket(url); await new Promise((r,j) => { ws.onopen=r; ws.onerror=j; });
 let id=0; const pending=new Map();
 const api={event:()=>{}, call:(method,params={},sessionId)=>new Promise((r,j)=>{pending.set(++id,{r,j});ws.send(JSON.stringify({id,method,params,sessionId}));}),close:()=>ws.close()};
 ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.j(Error(JSON.stringify(m.error))):p.r(m.result);}else api.event(m);};
 return api;
}
async function marionette(port){let socket;for(let i=0;i<300;i++){try{socket=await new Promise((r,j)=>{const s=net.connect(port,'127.0.0.1',()=>r(s));s.on('error',j)});break}catch{await sleep(200)}}if(!socket)throw Error('Firefox timeout');let b=Buffer.alloc(0),p=[],g;const greeting=new Promise(r=>g=r);socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);while(true){const colon=b.indexOf(58);if(colon<0)return;const n=Number(b.subarray(0,colon));if(b.length<colon+1+n)return;const m=JSON.parse(b.subarray(colon+1,colon+1+n));b=b.subarray(colon+1+n);if(!Array.isArray(m)){g(m);continue}const q=p.shift();m[2]?q.j(Error(JSON.stringify(m[2]))):q.r(m[3])}});await greeting;let id=0;return{call:(name,args={})=>new Promise((r,j)=>{p.push({r,j});const d=Buffer.from(JSON.stringify([0,++id,name,args]));socket.write(Buffer.concat([Buffer.from(d.length+':'),d]))}),close:()=>socket.end()};}

// Observe native media events without replacing playback or inference.
const probe = `
import { VoiceQueue } from '../voice.js';
let queue;
const clips=[];
const play=VoiceQueue.prototype.play;
VoiceQueue.prototype.play=function(path,...args){
 queue=this;const p=play.call(this,path,...args);
 if(p){const clip={path,events:[]};clips.push(clip);for(const e of ['playing','ended','error'])p.audio.addEventListener(e,()=>clip.events.push(e));}
 return p;
};
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(m.type==='audit:audio'&&s.id===chrome.runtime.id)reply({clips,players:queue?.players.size??0,context:queue?.context?.state??null});
});
`;
function fixture(browser) {
 const dir=out+'/'+browser+'-extension';fs.cpSync(root+'/dist/'+browser,dir,{recursive:true});

 fs.writeFileSync(dir+'/src/model-host/audit.js',probe);
 const entry=dir+'/src/'+(browser==='chrome'?'model-host/offscreen.js':'background.js');
 fs.appendFileSync(entry,"\nimport '"+(browser==='chrome'?'./audit.js':'./model-host/audit.js')+"';\n");
 return dir;
}
let E, pageEval, nativeRequests, setOffline, memory, shot;
const pageUrls=new Map();
let phase='startup';
const extensionRequest = r => r.initiator !== '[System Principal]';
async function waitFor(fn, label, timeout=30000) {
 const until=Date.now()+timeout;while(Date.now()<until){if(await fn())return;await sleep(200);}throw Error('Timeout: '+label);
}
async function scenario(name) {
 const result={browser:name,checks:[],memory:[],startedAt:new Date().toISOString()};
 const save=()=>fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({...result,requests:nativeRequests},null,2));
 const check=(label,pass,detail)=>{result.checks.push({label,pass:!!pass,detail});save();console.log(name,label,pass?'PASS':'FAIL');assert.ok(pass,label+' '+JSON.stringify(detail));};
 const send=(type,rest={})=>E('return await chrome.runtime.sendMessage('+JSON.stringify({type,...rest})+');');
 const data=()=>E("return await chrome.storage.local.get(null);");
 async function sample(label){const m=await memory();result.memory.push({label,...m});save();return m;}
 await waitFor(()=>E("return document.querySelector('#session-form')?.hidden===false;"),'popup ready');
 phase='negative-control';
 // Both requests must be blocked by CSP. No real ElevenLabs request is dispatched.
 const control=await E("window.violations=[];document.addEventListener('securitypolicyviolation',e=>window.violations.push({url:e.blockedURI,directive:e.effectiveDirective}));for(const url of ['https://api.elevenlabs.io/v1/user','https://example.com/butu-negative-control']){try{await fetch(url)}catch{}}await new Promise(r=>setTimeout(r,100));return window.violations;");
 check('audit negative control sees both forbidden CSP attempts',control.length===2&&control.every(e=>e.directive==='connect-src'),control);
 phase='cold';
 await sample('baseline');
 await E("window.downloadEvents=[];chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.modelDownload)window.downloadEvents.push(c.modelDownload.newValue);});document.querySelector('#task').value='DBMS assignment on normalization';document.querySelector('#session-form').requestSubmit();return true;");
 await waitFor(async()=>!!(await data()).session,'session start');
 check('popup starts session and shows countdown',await E("return !document.querySelector('#active-session').hidden&&/^[0-9]{2}:[0-9]{2}$/.test(document.querySelector('#countdown').textContent);"));
 const article=await E("return await chrome.tabs.create({url:'http://127.0.0.1:8789/work',active:true});");
 await E('return await chrome.windows.update('+article.windowId+',{focused:true});');
 let peak=0;
 await waitFor(async()=>{const m=await memory();peak=Math.max(peak,m.rssKiB);const d=await data();if(d.modelDownload?.state==='error')throw Error('Cold model failed');return d.verdictCache?.entries?.some?.(e=>e.url?.includes('/work'))||Object.values(d.verdictCache?.entries??{}).some(e=>e.url?.includes('/work'));},'cold semantic verdict',150000);
 result.coldState=await data();
 result.downloadEvents=await E('return window.downloadEvents;');
 check('cold model produces an on-task verdict',Object.values(result.coldState.offTaskTiming.tabs).some(t=>t.onTask===true),result.coldState.verdictCache);
 check('first download reports progress',result.downloadEvents.some(e=>e?.state==='downloading'));
 check('cold runtime remote requests only Hugging Face GETs without user text',nativeRequests.filter(r=>extensionRequest(r)&&r.phase==='cold'&&/^https?:/.test(r.url)&&!r.url.includes('127.0.0.1')).every(r=>r.method==='GET'&&/^https:\/\/(huggingface\.co|[^/]+\.hf\.co)\//.test(r.url)&&!r.body&& !r.url.includes('DBMS')),nativeRequests.filter(r=>r.phase==='cold'&&r.url.startsWith('https:')));
 check('cold audit actually observed model requests',nativeRequests.some(r=>r.phase==='cold'&&r.url.includes('huggingface.co/')));
 result.memory.push({label:'cold sampled peak',rssKiB:peak});save();
 await send('session:stop');
 await waitFor(()=>E("return !document.querySelector('#session-summary').hidden;"),'summary');
 check('stop archives and displays summary',(await data()).sessionHistory.length===1);
 phase='offline-control';await setOffline(true);
 const blocked=await E("try{await fetch('https://huggingface.co/butu-audit-negative-control');return false;}catch{return true;}");
 await memory();
 check('native offline guard rejects and records an allowed-origin probe',blocked&&nativeRequests.some(r=>r.phase==='offline-control'&&r.url.includes('butu-audit-negative-control')));
 phase='offline';
 await E("document.querySelector('#again').click();document.querySelector('#task').value='DBMS assignment on normalization';document.querySelector('#session-form').requestSubmit();return true;");
 await E('return await chrome.tabs.update('+article.id+",{url:'http://127.0.0.1:8789/work-cached',active:true});");
 await waitFor(async()=>{const d=await data();return d.modelDownload?.state==='ready'&&Object.values(d.offTaskTiming?.tabs??{}).some(t=>t.onTask===true);},'offline cached model verdict',45000);
 check('cached semantic inference succeeds with external network blocked',true);
 await sample('cached model');
 await send('session:stop');
 // UI/settings assets and native host audio in the same blocked-network phase.
 const beforeDiary=await E("return (await chrome.tabs.query({})).map(t=>t.id);");
 const diaryUrl=await E("return document.querySelector('#diary-link').href;");
 await E("const t=await chrome.tabs.getCurrent();await chrome.tabs.update(t.id,{active:true});return true;");
 await E("document.querySelector('#diary-link').click();return true;");
 let diary;await waitFor(async()=>{diary=(await E("return await chrome.tabs.query({});")).find(t=>!beforeDiary.includes(t.id));return !!diary;},'diary tab opens');
 pageUrls.set(diary.id,diaryUrl);
 await waitFor(()=>pageEval(diary.id,"return document.querySelectorAll('.session-page').length===2;"),'diary history');
 check('diary from popup shows both real sessions',true);
 await pageEval(diary.id,"await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));document.querySelector('nav a').click();return true;");
 pageUrls.set(diary.id,diaryUrl.replace('diary.html','settings.html'));
 await waitFor(()=>pageEval(diary.id,"return !!document.querySelector('#settings-fields')&&!document.querySelector('#settings-fields').disabled;"),'settings');
 await pageEval(diary.id,"document.querySelector('#test-voice').click();return true;");
 await sleep(1000);
 check('settings voice test works offline',await pageEval(diary.id,"return document.querySelector('#settings-status').textContent.startsWith('Voice test requested.');"));
 await E("await chrome.storage.local.set({allowlist:['localhost'],blocklist:['127.0.0.1'],muted:false,volume:.25});return true;");
 await send('session:start',{task:'DBMS assignment on normalization',minutes:10});
 const drift=await E("return await chrome.tabs.create({url:'http://127.0.0.1:8789/drift',active:true});");
 await E('return await chrome.windows.update('+drift.windowId+',{focused:true});');
 await waitFor(async()=>{const d=await data();return d.offTaskTiming?.activeTabId===drift.id&&d.offTaskTiming.tabs[drift.id]?.onTask===false;},'drift visible');
 const original=await pageEval(drift.id,'window.savedHeading=document.querySelector("h1");window.savedText=window.savedHeading.firstChild;return document.documentElement.outerHTML;');
 // Task 4.9 exercises every asset without a three-minute wait. Task 4.10 uses real time.
 for(const [stage,seconds] of [[1,16],[2,46],[3,91],[4,181]]){
  for(let attempt=0;attempt<8;attempt++){
   await E('const d=await chrome.storage.local.get("offTaskTiming");d.offTaskTiming.tabs['+drift.id+'].seconds='+seconds+';d.offTaskTiming.updatedAt=Date.now();await chrome.storage.local.set(d);await chrome.tabs.sendMessage('+drift.id+',{type:"timing:poll"});return true;');
   await sleep(1200);
   if(await pageEval(drift.id,'return document.querySelector("[data-butu-haunt-root]")?.getAttribute("data-butu-stage")==="'+stage+'";'))break;
  }
  await waitFor(()=>pageEval(drift.id,'return document.querySelector("[data-butu-haunt-root]")?.getAttribute("data-butu-stage")==="'+stage+'";'),'stage '+stage);
  await waitFor(async()=>{const s=await send('audit:audio');return s?.clips.some(c=>c.path.startsWith('music-box/stage-'+stage)&&c.events.includes('playing'));},'offline stage audio '+stage);
  if(stage>1)await waitFor(async()=>{const s=await send('audit:audio');return s?.clips.filter(c=>c.path.startsWith('voice/')&&c.events.includes('playing')).length>=stage-1;},'custom voice '+stage);
  check('offline stage '+stage+' visuals and native audio',true);
 }
 result.audio=await send('audit:audio');
 check('all stage speech uses bundled custom pack',result.audio.clips.filter(c=>c.path.startsWith('voice/')).length===3&&result.audio.clips.filter(c=>c.path.startsWith('voice/')).every(c=>/^voice\/butu-\d\d$/.test(c.path)));
 const work=await E("return await chrome.tabs.create({url:'http://localhost:8789/work',active:true});");
 await sleep(3000);
 check('return restores exact HTML and original nodes',await pageEval(drift.id,'return document.documentElement.outerHTML==='+JSON.stringify(original)+'&&document.querySelector("h1")===window.savedHeading&&window.savedHeading.firstChild===window.savedText;'));
 check('on-task work page remains untouched',await pageEval(work.id,'return !document.querySelector("[data-butu-haunt-root]");'));
 await send('session:stop');await sleep(2500);
 await sample('after stop');
 check('offline runtime has zero external HTTP attempts',!nativeRequests.some(r=>extensionRequest(r)&&r.phase==='offline'&&/^https?:/.test(r.url)&&!/^http:\/\/(localhost|127\.0\.0\.1):8789\//.test(r.url)));
 check('fonts images and audio never request network origins',!nativeRequests.some(r=>extensionRequest(r)&&/^https?:/.test(r.url)&&!/^http:\/\/(localhost|127\.0\.0\.1):8789\//.test(r.url)&&/^(Font|Image|Media|3|14|15)$/.test(r.type)&&r.phase!=='negative-control'));
 result.finishedAt=new Date().toISOString();save();
}

async function chromeRun() {
 const profile=out+'/chrome-profile',log=fs.openSync(out+'/chrome.log','w');
 const child=spawn(process.env.BUTU_CHROME??process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',['--headless','--no-sandbox','--disable-gpu','--disable-background-networking',...(full?['--disable-component-extensions-with-background-pages']:[]),'--no-first-run','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'--remote-debugging-port=0','about:blank'],{stdio:['ignore',log,log]});
 let browser,view;const pages=new Map(),sessions=new Set();let offline=false,port;
 nativeRequests=[];phase='startup';
 try {
  await waitFor(async()=>{try{port=fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];return true;}catch{return false;}},'Chrome start');
  const version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();browser=await connect(version.webSocketDebuggerUrl);
  const filter=[{type:'browser',exclude:true},{type:'tab',exclude:true},{}];
  browser.event=async m=>{
   try {
    if(m.method==='Target.attachedToTarget'){
     const s=m.params.sessionId;sessions.add(s);
     await browser.call('Network.enable',{},s);
     await browser.call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true,filter},s);
     if(offline)await browser.call('Network.setBlockedURLs',{urls:['https://*']},s);
     await browser.call('Runtime.runIfWaitingForDebugger',{},s);
    }
    if(m.method==='Target.detachedFromTarget')sessions.delete(m.params.sessionId);
    if(m.method==='Network.requestWillBeSent')nativeRequests.push({phase,url:m.params.request.url,headers:m.params.request.headers,method:m.params.request.method,body:m.params.request.postData??null,type:m.params.type,initiator:m.params.initiator.type});
    
   }catch(e){if(!/closed|session|target|domain/i.test(e.message))console.error('observer:',e.message);}
  };
  if(!full)await browser.call('Target.setAutoAttach',{autoAttach:true,waitForDebuggerOnStart:true,flatten:true,filter});
  const {id}=await browser.call('Extensions.loadUnpacked',{path:fixture('chrome')});
  const {targetId}=await browser.call('Target.createTarget',{url:'chrome-extension://'+id+'/src/popup/popup.html'});
  async function page(id){if(!pages.has(id)){const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const t=targets.find(t=>t.id===id);if(!t)throw Error('Missing target '+id);pages.set(id,await connect(t.webSocketDebuggerUrl));}return pages.get(id);}
  view=await page(targetId);
  const evaluate=async(v,code)=>{const r=await v.call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  E=code=>evaluate(view,code);
  pageEval=async(id,code)=>{const url=(pageUrls.get(id)??await E('return (await chrome.tabs.get('+id+')).url;'))?.replaceAll(':8789',':'+fixturePort);const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();const target=targets.find(t=>t.type==='page'&&t.url===url);return target?evaluate(await page(target.id),code):undefined;};
  setOffline=async value=>{offline=value;for(const s of sessions)await browser.call('Network.setBlockedURLs',{urls:value?['https://*']:[]},s).catch(()=>{});};
  memory=async()=>{const {processInfo}=await browser.call('SystemInfo.getProcessInfo');return rss(processInfo.filter(p=>p.type==='renderer'&&fs.readFileSync('/proc/'+p.id+'/cmdline','utf8').includes('--extension-process')).map(p=>p.id));};
  shot=async(label)=>{const s=await view.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+label+'.png',Buffer.from(s.data,'base64'));};
  await runScenario(version.Browser.replace('/','-'));
 }finally{for(const p of pages.values())p.close();if(browser){await browser.call('Browser.close').catch(()=>{});browser.close();}child.kill();fs.closeSync(log);}
}
function rss(pids){let rssKiB=0;for(const pid of pids){try{rssKiB+=Number(fs.readFileSync('/proc/'+pid+'/status','utf8').match(/VmRSS:\s+(\d+)/)[1]);}catch{}}return {pids,rssKiB};}
async function firefoxRun() {
 const profile=out+'/firefox-profile';fs.mkdirSync(profile,{recursive:true});fs.writeFileSync(profile+'/user.js','user_pref("marionette.port",2887);\nuser_pref("browser.shell.checkDefaultBrowser",false);\n');
 const log=fs.openSync(out+'/firefox.log','w');const child=spawn(process.env.BUTU_FIREFOX??'firefox',['--headless','--no-remote','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],{stdio:['ignore',log,log]});let m;
 nativeRequests=[];phase='startup';
 try{
  m=await marionette(2887);const session=await m.call('WebDriver:NewSession',{capabilities:{}});
  await m.call('WebDriver:SetTimeouts',{script:180000,pageLoad:30000});
  async function privileged(code){await m.call('Marionette:SetContext',{value:'chrome'});const r=await m.call('WebDriver:ExecuteScript',{script:code,args:[]});await m.call('Marionette:SetContext',{value:'content'});return r.value;}
  await privileged(`window.auditRequests=[];window.auditOffline=false;window.auditObserver={observe(subject){try{const c=subject.QueryInterface(Ci.nsIHttpChannel);const url=c.URI.spec;window.auditRequests.push({url,method:c.requestMethod,body:c instanceof Ci.nsIUploadChannel&&!!c.uploadStream,type:String(c.loadInfo.externalContentPolicyType),initiator:c.loadInfo.triggeringPrincipal?.origin});if(window.auditOffline&&url.startsWith('https:'))c.cancel(Cr.NS_ERROR_OFFLINE);}catch{}}};Services.obs.addObserver(window.auditObserver,'http-on-modify-request');return true;`);
  await m.call('Addon:Install',{path:fixture('firefox'),temporary:true});
  const url=await privileged("return WebExtensionPolicy.getByID('butu@butu.test').getURL('src/popup/popup.html');");
  await m.call('WebDriver:Navigate',{url});
  E=async code=>{const r=await m.call('WebDriver:ExecuteAsyncScript',{script:'const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(value=>done({value}),e=>done({error:String(e)}));',args:[],newSandbox:false});if(r.value.error)throw Error(r.value.error);return r.value.value;};
  const response=await m.call('WebDriver:GetWindowHandle');const popup=response.value??response;
  const handlesByUrl=new Map();
  pageEval=async(id,code)=>{
   const url=(pageUrls.get(id)??await E('return (await chrome.tabs.get('+id+')).url;'))?.replaceAll(':8789',':'+fixturePort);
   const active=await E("return (await chrome.tabs.query({active:true,currentWindow:true}))[0]?.id;");
   let handle=handlesByUrl.get(url);
   try{
    if(!handle){const response=await m.call('WebDriver:GetWindowHandles');for(const candidate of response.value??response){
     await m.call('WebDriver:SwitchToWindow',{handle:candidate,focus:false});
     if(await E('return location.href;')===url){handle=candidate;handlesByUrl.set(url,handle);break;}
    }}else await m.call('WebDriver:SwitchToWindow',{handle,focus:false});
    if(!handle)return undefined;
    return await E(code);
   }finally{await m.call('WebDriver:SwitchToWindow',{handle:popup,focus:false});if(active)await E('return await chrome.tabs.update('+active+',{active:true});');}
  };
  setOffline=value=>privileged('window.auditOffline='+value+';return true;');
  memory=async()=>{const records=await privileged("const r=window.auditRequests.splice(0);return {records:r,pids:ChromeUtils.getAllDOMProcesses().filter(p=>p.remoteType==='extension').map(p=>p.osPid)};");nativeRequests.push(...records.records.map(r=>({...r,phase})));return rss(records.pids);};
  // Drain native events between scenario commands so phase labels remain meaningful.
  const evaluate=E;E=async code=>{await memory();return evaluate(code);};
  shot=async label=>{const s=await m.call('WebDriver:TakeScreenshot',{full:true});fs.writeFileSync(out+'/'+label+'.png',Buffer.from(s.value,'base64'));};
  await runScenario('Firefox-'+session.capabilities.browserVersion);
 }finally{m?.close();child.kill();fs.closeSync(log);}
}
async function runScenario(name) {
 if(full)await require('./definition-scenario.cjs')({name,E:code=>E(code.replaceAll(':8789',':'+fixturePort)),pageEval,pageUrls,memory,shot,out,waitFor,sleep});
 else await scenario(name);
}

(async()=>{
 console.log('Evidence: '+out);
 const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><html><head><title>Database normalization</title></head><body><h1>Database normalization</h1><p>Database normal forms, SQL tables and functional dependencies.</p><input value="keep this"></body></html>');});
 await new Promise(r=>server.listen(fixturePort,'0.0.0.0',r));
 try{if(process.argv[2]!=='firefox')await chromeRun();if(process.argv[2]!=='chrome')await firefoxRun();}finally{server.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
