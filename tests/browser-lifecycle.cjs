const fs=require('node:fs'),net=require('node:net'),{spawn}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..'),out=process.env.BUTU_LIFECYCLE_RESULTS??root+'/.local-reports/lifecycle/run-'+Date.now();fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const p=new Map();ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const q=p.get(m.id);p.delete(m.id);m.error?q.j(Error(JSON.stringify(m.error))):q.r(m.result)}};return{call:(method,params={})=>new Promise((r,j)=>{p.set(++id,{r,j});ws.send(JSON.stringify({id,method,params}))}),close:()=>ws.close()};}
async function marionette(port){let socket;for(let i=0;i<300;i++){try{socket=await new Promise((r,j)=>{const s=net.connect(port,'127.0.0.1',()=>r(s));s.on('error',j)});break}catch{await sleep(200)}}if(!socket)throw Error('Firefox timeout');let b=Buffer.alloc(0),p=[],g;const greeting=new Promise(r=>g=r);socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);while(true){const colon=b.indexOf(58);if(colon<0)return;const n=Number(b.subarray(0,colon));if(b.length<colon+1+n)return;const m=JSON.parse(b.subarray(colon+1,colon+1+n));b=b.subarray(colon+1+n);if(!Array.isArray(m)){g(m);continue}const q=p.shift();m[2]?q.j(Error(JSON.stringify(m[2]))):q.r(m[3])}});await greeting;let id=0;return{call:(name,args={})=>new Promise((r,j)=>{p.push({r,j});const d=Buffer.from(JSON.stringify([0,++id,name,args]));socket.write(Buffer.concat([Buffer.from(d.length+':'),d]))}),close:()=>socket.end()};}

const probe = `
import { EmbeddingHost } from './embedding-host.js';
let current;
const compare = EmbeddingHost.prototype.compare;
EmbeddingHost.prototype.compare = function(...args) { current = this; return compare.apply(this,args); };
chrome.runtime.onMessage.addListener((m,s,reply)=>{
 if(s.id!==chrome.runtime.id)return;
 if(m.type==='check:snapshot')reply({worker:!!current?.worker,cache:current?.cache.size??0});
});
`;
function fixture(browser) {
 const dir=out+'/'+browser+'-extension';fs.cpSync(root+'/dist/'+browser,dir,{recursive:true});
 fs.writeFileSync(dir+'/src/model-host/check.js',probe);
 fs.appendFileSync(dir+'/src/background.js',"\nimport './model-host/check.js';\n");
 fs.appendFileSync(dir+'/src/model-host/offscreen.js',"\nimport './check.js';\n");
 return dir;
}
let memory, screenshot;
async function scenario(name,E) {
 const assert=require('node:assert/strict');
 const send=(type,rest={})=>E('return await chrome.runtime.sendMessage('+JSON.stringify({type,...rest})+');');
 await send('session:stop');
 const before=await memory();
 await E("window.progressEvents=[];chrome.storage.onChanged.addListener((c,a)=>{if(a==='local'&&c.modelDownload)window.progressEvents.push(c.modelDownload.newValue);});return true;");
 await send('session:start',{task:'Study databases',minutes:25});
 await E("const tab=await chrome.tabs.create({url:'http://127.0.0.1:8789/',active:true});window.testTab=tab.id;return true;");
 let loaded,events;
 for(let i=0;i<360;i++){
  const state=await E("return (await chrome.storage.local.get('modelDownload')).modelDownload;");
  if(state?.state==='error')throw Error('Model download failed');
  if(state?.state==='ready'){loaded=await memory();break;}
  await sleep(500);
 }
 assert.ok(loaded,'real page verdict finishes');
 events=await E('return window.progressEvents;');
 assert.ok(events.some(e=>e?.state==='loading'),'preparation progress');
 assert.ok(events.some(e=>e?.state==='downloading'),'real download progress');
 assert.equal(await E("return document.querySelector('#model-download').hidden;"),true,'ready hides waking UI');
 // Reopen-equivalent rendering from persisted progress, including unknown totals/error.
 const real=events.find(e=>e?.state==='downloading'&&e.percent!==null);
 assert.ok(real,'measured per-file percent');
 await send('session:stop');
 const snapshot=await send('check:snapshot');assert.equal(snapshot.worker,false);assert.equal(snapshot.cache,0);
 if(name.startsWith('Chrome'))assert.equal(await E("return (await chrome.runtime.getContexts({contextTypes:['OFFSCREEN_DOCUMENT']})).length;"),0,'offscreen document closed');
 await sleep(3000);const ended=await memory();
 assert.ok(ended.rssKiB<loaded.rssKiB,'memory drops after stop: '+JSON.stringify({loaded,ended}));
 // Exercise popup rendering separately so reloads cannot trigger the idle release
 // before the loaded-memory sample. These UI states reuse a real download event.
 await E("const tabs=await chrome.tabs.query({});await Promise.all(tabs.filter(t=>t.url?.startsWith('http://127.0.0.1:8789')).map(t=>chrome.tabs.remove(t.id)));return true;");
 const {session}=await send('session:start',{task:'Study databases',minutes:25});
 real.sessionKey=JSON.stringify([session.startedAt,session.endsAt,session.task]);
 await E('await chrome.storage.local.set({modelDownload:'+JSON.stringify(real)+'});scrollTo(0,0);return true;');
 await sleep(100);
 assert.equal(await E("return !document.querySelector('#model-download').hidden&&document.querySelector('#download-heading').textContent==='Butu is waking up…'&&document.querySelector('#download-progress').hasAttribute('value');"),true);
 await screenshot(name+'-download');
 await E("setTimeout(()=>location.reload(),20);return true;");await sleep(500);
 let reopened=false;
 for(let i=0;i<50;i++) {if(await E("return !document.querySelector('#model-download').hidden;")){reopened=true;break;}await sleep(100);}
 assert.ok(reopened,'reopen reads persisted progress');
 await E('await chrome.storage.local.set({modelDownload:{...'+JSON.stringify(real)+",percent:null}});return true;");await sleep(100);
 assert.equal(await E("return !document.querySelector('#download-progress').hasAttribute('value');"),true,'unknown byte total is indeterminate');
 await E('await chrome.storage.local.set({modelDownload:{...'+JSON.stringify(real)+",state:'error',percent:null}});return true;");await sleep(100);
 assert.equal(await E("return document.querySelector('#download-progress').hidden&&document.querySelector('#download-detail').textContent.includes('Page checking is paused');"),true,'failure recovery copy');
 await send('session:stop');await sleep(100);
 assert.equal(await E("const d=await chrome.storage.local.get('modelDownload');return d.modelDownload===null&&document.querySelector('#model-download').hidden;"),true,'stop clears status and UI');
 fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({name,before,loaded,ended,snapshot,events,uiChecks:['ready hidden','determinate progress','reopen','unknown total','error recovery','stop cleanup']},null,2));
 console.log(name,JSON.stringify({before,loaded,ended,snapshot,progressEvents:events.length}));
}
function rss(pids) {let rssKiB=0;for(const pid of pids){try{rssKiB+=Number(fs.readFileSync('/proc/'+pid+'/status','utf8').match(/VmRSS:\s+(\d+)/)[1])}catch{}}return {pids,rssKiB};}
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
  const E=async code=>{const r=await view.call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  screenshot=async name=>{const shot=await view.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(shot.data,'base64'));};
  memory=async()=>{const {processInfo}=await browser.call('SystemInfo.getProcessInfo');return rss(processInfo.filter(p=>p.type==='renderer'&&fs.readFileSync('/proc/'+p.id+'/cmdline','utf8').includes('--extension-process')).map(p=>p.id));};
  await view.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await scenario(version.Browser.replace('/','-'),E); const {cssContentSize:size}=await view.call('Page.getLayoutMetrics');const s=await view.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}});fs.writeFileSync(out+'/chrome.png',Buffer.from(s.data,'base64'));
 }finally{view?.close();if(browser){await browser.call('Browser.close').catch(()=>{});browser.close()}child.kill();fs.closeSync(log)}
}
async function firefoxRun(){
 const profile=out+'/firefox-profile';fs.mkdirSync(profile,{recursive:true});fs.writeFileSync(profile+'/user.js','user_pref("marionette.port",2887);\nuser_pref("browser.shell.checkDefaultBrowser",false);\n');
 const log=fs.openSync(out+'/firefox.log','w');const child=spawn(process.env.BUTU_FIREFOX || 'firefox',['--headless','--no-remote','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],{stdio:['ignore',log,log]});let m;
 try{
  m=await marionette(2887);const session=await m.call('WebDriver:NewSession',{capabilities:{}});
  await m.call('WebDriver:SetTimeouts',{script:30000,pageLoad:30000});await m.call('Addon:Install',{path:fixture('firefox'),temporary:true});
  await m.call('Marionette:SetContext',{value:'chrome'});const{value:url}=await m.call('WebDriver:ExecuteScript',{script:"return WebExtensionPolicy.getByID('butu@butu.test').getURL('src/popup/popup.html');",args:[]});
  await m.call('Marionette:SetContext',{value:'content'});await m.call('WebDriver:Navigate',{url});
  const E=async code=>{const r=await m.call('WebDriver:ExecuteAsyncScript',{script:'const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(value=>done({value}),e=>done({error:String(e)}));',args:[],newSandbox:false});if(r.value.error)throw Error(r.value.error);return r.value.value;};
  screenshot=async name=>{const shot=await m.call('WebDriver:TakeScreenshot',{full:true});fs.writeFileSync(out+'/'+name+'.png',Buffer.from(shot.value,'base64'));};
  memory=async()=>{await m.call('Marionette:SetContext',{value:'chrome'});const r=await m.call('WebDriver:ExecuteScript',{script: "return ChromeUtils.getAllDOMProcesses().filter(p=>p.remoteType==='extension').map(p=>p.osPid);",args:[]});await m.call('Marionette:SetContext',{value:'content'});return rss(r.value);};
  await m.call('WebDriver:SetWindowRect',{width:1100,height:900});await scenario('Firefox-'+session.capabilities.browserVersion,E); const s=await m.call('WebDriver:TakeScreenshot',{full:true});fs.writeFileSync(out+'/firefox.png',Buffer.from(s.value,'base64'));
 }finally{m?.close();child.kill();fs.closeSync(log)}
}

(async()=>{console.log('Evidence: '+out);const server=require('node:http').createServer((req,res)=>{res.writeHead(200,{'content-type':'text/html'});res.end('<!doctype html><title>Database normalization</title><h1>Databases</h1><p>SQL transactions and database normalization.</p>')});await new Promise(r=>server.listen(8789,'127.0.0.1',r));try{if(process.argv[2]!=='firefox')await chromeRun();if(process.argv[2]!=='chrome')await firefoxRun()}finally{server.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
