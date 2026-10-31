const fs=require('node:fs'),net=require('node:net'),{spawn}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..'),out=root+'/.local-reports/summary/run-'+Date.now();fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const p=new Map();ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const q=p.get(m.id);p.delete(m.id);m.error?q.j(Error(JSON.stringify(m.error))):q.r(m.result)}};return{call:(method,params={})=>new Promise((r,j)=>{p.set(++id,{r,j});ws.send(JSON.stringify({id,method,params}))}),close:()=>ws.close()};}
async function marionette(port){let socket;for(let i=0;i<300;i++){try{socket=await new Promise((r,j)=>{const s=net.connect(port,'127.0.0.1',()=>r(s));s.on('error',j)});break}catch{await sleep(200)}}if(!socket)throw Error('Firefox timeout');let b=Buffer.alloc(0),p=[],g;const greeting=new Promise(r=>g=r);socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);while(true){const colon=b.indexOf(58);if(colon<0)return;const n=Number(b.subarray(0,colon));if(b.length<colon+1+n)return;const m=JSON.parse(b.subarray(colon+1,colon+1+n));b=b.subarray(colon+1+n);if(!Array.isArray(m)){g(m);continue}const q=p.shift();m[2]?q.j(Error(JSON.stringify(m[2]))):q.r(m[3])}});await greeting;let id=0;return{call:(name,args={})=>new Promise((r,j)=>{p.push({r,j});const d=Buffer.from(JSON.stringify([0,++id,name,args]));socket.write(Buffer.concat([Buffer.from(d.length+':'),d]))}),close:()=>socket.end()};}

async function scenario(name,E) {
 const assert=require('node:assert/strict'),checks=[];
 const run=async code=>E(code);
 const send=type=>run("return await new Promise(r=>chrome.runtime.sendMessage({type:'"+type+"'},r));");
 const state=()=>run("return {summary:!document.querySelector('#session-summary').hidden,form:!document.querySelector('#session-form').hidden,active:!document.querySelector('#active-session').hidden,text:document.querySelector('#session-summary').innerText,task:document.querySelector('#summary-task').textContent};");
 const check=(label,yes)=>{assert.ok(yes,label);checks.push(label);console.log(name,label,'PASS')};
 const waitFor=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await sleep(100)}throw Error('Timed out')};
 await waitFor(async()=> (await state()).form);
 check('fresh profile shows form',!(await state()).summary);
 const beforeTabs=await run("return (await new Promise(r=>chrome.tabs.query({},r))).length;");
 await run("document.querySelector('#diary-link').click();return true;");
 await waitFor(async()=>run("return (await new Promise(r=>chrome.tabs.query({},r))).length>"+beforeTabs));
 check('diary link opens bundled diary in tab',true);
 await run("await new Promise(r=>chrome.storage.local.set({muted:true,allowlist:['localhost'],blocklist:['127.0.0.1']},r));document.querySelector('#task').value='<b>Study DBMS</b>';document.querySelector('#task').value='<b>Study DBMS</b>';document.querySelector('#session-form').requestSubmit();return true;");
 await waitFor(async()=> (await state()).active);
 const tab=await run("return await new Promise(r=>chrome.tabs.create({url:'http://127.0.0.1:8791/drift',active:true},r));");
 await run("return await new Promise(r=>chrome.windows.update("+tab.windowId+",{focused:true},r));");
 await waitFor(async()=>run("const d=await new Promise(r=>chrome.storage.local.get('offTaskTiming',r));return d.offTaskTiming?.stats?.offTaskSeconds>1;"));
 await sleep(2000);
 await run("document.querySelector('#stop').click();return true;");
 await waitFor(async()=> (await state()).summary);
 let data=await run("return await new Promise(r=>chrome.storage.local.get(['session','sessionHistory'],r));");
 let summary=await state();
 check('manual stop archives once and shows all stats',data.session===null&&data.sessionHistory.length===1&&data.sessionHistory[0].timesWandered===1&&summary.text.includes('Minutes Butu waited alone'));
 check('task markup stays literal',summary.task==='<b>Study DBMS</b>'&&await run("return !document.querySelector('#summary-task b')"));
 await run("setTimeout(()=>location.reload(),100);return true;");await sleep(1200);await waitFor(async()=> (await state()).summary);
 check('reopened popup restores the same summary',(await state()).text===summary.text);
 await send('session:stop');
 check('repeat stop does not duplicate history',(await run("return await new Promise(r=>chrome.storage.local.get('sessionHistory',r));")).sessionHistory.length===1);
 await run("document.querySelector('#again').click();return true;");
 check('start another session restores form',(await state()).form&&!(await state()).summary);
 await run("document.querySelector('#task').value='<b>Study DBMS</b>';document.querySelector('#session-form').requestSubmit();return true;");
 await waitFor(async()=> (await state()).active);
 check('new session hides previous summary',!(await state()).summary);
 // Seed an overdue session, then ask the real background to reconcile it.
 await run("const d=await new Promise(r=>chrome.storage.local.get('session',r));d.session.startedAt=Date.now()-60000;d.session.endsAt=Date.now()-1;await new Promise(r=>chrome.storage.local.set({session:d.session},r));return true;");
 await send('session:get');await waitFor(async()=> (await state()).summary);
 data=await run("return await new Promise(r=>chrome.storage.local.get(['session','sessionHistory'],r));");
 check('missed expiry is archived and summary refreshed',data.sessionHistory.length===2&&data.sessionHistory[1].completed);
 await run("const d=await new Promise(r=>chrome.storage.local.get('sessionHistory',r));await new Promise(r=>chrome.storage.local.set({sessionHistory:Array.from({length:50},(_,i)=>({...d.sessionHistory[0],task:'Retention '+i}))},r));return true;");
 await run("document.querySelector('#again').click();document.querySelector('#task').value='<b>Study DBMS</b>';document.querySelector('#session-form').requestSubmit();return true;");await waitFor(async()=> (await state()).active);
 await send('session:stop');await waitFor(async()=> (await state()).summary);
 data=await run("return await new Promise(r=>chrome.storage.local.get('sessionHistory',r));");
 check('real storage retains newest 50',data.sessionHistory.length===50&&data.sessionHistory[0].task==='Retention 1');
 check('summary fits popup width',await run("return document.body.scrollWidth<=360&&document.documentElement.scrollWidth<=innerWidth"));
 fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({browser:name,checks,latest:data.sessionHistory.at(-1)},null,2));
}
async function chromeRun(){
 const profile=out+'/chrome-profile',log=fs.openSync(out+'/chrome.log','w');
 const child=spawn(process.env.BUTU_CHROME || (fs.existsSync(process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome') ? process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' : 'chromium'),['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'--remote-debugging-port=0','about:blank'],{stdio:['ignore',log,log]});
 let browser,view;
 try{
  let port,version;for(let i=0;i<100;i++){try{port=fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();browser=await connect(version.webSocketDebuggerUrl);break}catch{await sleep(200)}}
  if(!browser)throw Error('Chrome timeout');
  const{id}=await browser.call('Extensions.loadUnpacked',{path:root+'/dist/chrome'});
  const{targetId}=await browser.call('Target.createTarget',{url:'chrome-extension://'+id+'/src/popup/popup.html'});
  const ts=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();view=await connect(ts.find(t=>t.id===targetId).webSocketDebuggerUrl);await sleep(1000);
  const E=async code=>{const r=await view.call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await view.call('Emulation.setDeviceMetricsOverride',{width:360,height:600,deviceScaleFactor:1,mobile:false});await scenario(version.Browser.replace('/','-'),E); const targets=await browser.call('Target.getTargets');if(!targets.targetInfos.some(t=>t.url.endsWith('/src/diary/diary.html')))throw Error('Missing diary target');const s=await view.call('Page.captureScreenshot',{format:'png'});fs.writeFileSync(out+'/chrome.png',Buffer.from(s.data,'base64'));
 }finally{view?.close();if(browser){await browser.call('Browser.close').catch(()=>{});browser.close()}child.kill();fs.closeSync(log)}
}
async function firefoxRun(){
 const profile=out+'/firefox-profile';fs.mkdirSync(profile);fs.writeFileSync(profile+'/user.js','user_pref("marionette.port",2887);\nuser_pref("browser.shell.checkDefaultBrowser",false);\n');
 const log=fs.openSync(out+'/firefox.log','w');const child=spawn(process.env.BUTU_FIREFOX || 'firefox',['--headless','--no-remote','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],{stdio:['ignore',log,log]});let m;
 try{
  m=await marionette(2887);const session=await m.call('WebDriver:NewSession',{capabilities:{}});
  await m.call('WebDriver:SetTimeouts',{script:30000,pageLoad:30000});await m.call('Addon:Install',{path:root+'/dist/firefox',temporary:true});
  await m.call('Marionette:SetContext',{value:'chrome'});const{value:url}=await m.call('WebDriver:ExecuteScript',{script:"return WebExtensionPolicy.getByID('butu@butu.test').getURL('src/popup/popup.html');",args:[]});
  await m.call('Marionette:SetContext',{value:'content'});await m.call('WebDriver:Navigate',{url});
  const E=async code=>{const r=await m.call('WebDriver:ExecuteAsyncScript',{script:'const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(value=>done({value}),e=>done({error:String(e)}));',args:[],newSandbox:false});if(r.value.error)throw Error(r.value.error);return r.value.value;};
  await m.call('WebDriver:SetWindowRect',{width:450,height:750});await scenario('Firefox-'+session.capabilities.browserVersion,E); const s=await m.call('WebDriver:TakeScreenshot',{});fs.writeFileSync(out+'/firefox.png',Buffer.from(s.value,'base64'));
 }finally{m?.close();child.kill();fs.closeSync(log)}
}

(async()=>{console.log('Evidence: '+out);const server=require('node:http').createServer((q,s)=>s.end('<!doctype html><title>Games</title><h1>Games</h1>'));await new Promise(r=>server.listen(8791,'127.0.0.1',r));try{if(process.argv[2]!=='firefox')await chromeRun();if(process.argv[2]!=='chrome')await firefoxRun()}finally{server.close()}})().catch(e=>{console.error(e.stack);process.exitCode=1});
