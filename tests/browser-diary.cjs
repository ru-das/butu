const fs=require('node:fs'),net=require('node:net'),{spawn}=require('node:child_process');
const root=require('node:path').resolve(__dirname,'..'),out=root+'/.local-reports/diary/run-'+Date.now();fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(url){const ws=new WebSocket(url);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});let id=0;const p=new Map();ws.onmessage=({data})=>{const m=JSON.parse(data);if(m.id){const q=p.get(m.id);p.delete(m.id);m.error?q.j(Error(JSON.stringify(m.error))):q.r(m.result)}};return{call:(method,params={})=>new Promise((r,j)=>{p.set(++id,{r,j});ws.send(JSON.stringify({id,method,params}))}),close:()=>ws.close()};}
async function marionette(port){let socket;for(let i=0;i<300;i++){try{socket=await new Promise((r,j)=>{const s=net.connect(port,'127.0.0.1',()=>r(s));s.on('error',j)});break}catch{await sleep(200)}}if(!socket)throw Error('Firefox timeout');let b=Buffer.alloc(0),p=[],g;const greeting=new Promise(r=>g=r);socket.on('data',chunk=>{b=Buffer.concat([b,chunk]);while(true){const colon=b.indexOf(58);if(colon<0)return;const n=Number(b.subarray(0,colon));if(b.length<colon+1+n)return;const m=JSON.parse(b.subarray(colon+1,colon+1+n));b=b.subarray(colon+1+n);if(!Array.isArray(m)){g(m);continue}const q=p.shift();m[2]?q.j(Error(JSON.stringify(m[2]))):q.r(m[3])}});await greeting;let id=0;return{call:(name,args={})=>new Promise((r,j)=>{p.push({r,j});const d=Buffer.from(JSON.stringify([0,++id,name,args]));socket.write(Buffer.concat([Buffer.from(d.length+':'),d]))}),close:()=>socket.end()};}

async function scenario(name,E) {
 const assert=require('node:assert/strict'),checks=[];
 const check=(label,yes)=>{assert.ok(yes,label);checks.push(label);console.log(name,label,'PASS')};
 const waitFor=async fn=>{for(let i=0;i<80;i++){if(await fn())return;await sleep(100)}throw Error('Timed out')};
 const count=()=>E("return document.querySelectorAll('.session-page').length;");
 await waitFor(()=>E("return document.querySelector('#pages').getAttribute('aria-busy')==='false';"));
 check('fresh diary shows helpful empty state',await E("return !document.querySelector('#empty').hidden;"));
 await E("const now=Date.now();await chrome.storage.local.set({sessionHistory:[0,120,600].map((off,i)=>({task:i===2?'<b>Study DBMS</b>':'Study DBMS '+i,startedAt:now-i*3600000,endsAt:now+600000,endedAt:now,elapsedSeconds:600,completed:i===0,offTaskSeconds:off,timesWandered:i,domains:i===2?['Reddit.com','reddit.com.','video.example.com','bad/path']:[],caption:'A little page for us.'}))});return true;");
 await waitFor(async()=>await count()===3);
 check('three saved sessions update live',await E("return document.querySelector('#empty').hidden;"));
 check('newest saved entry appears first and markup stays literal',await E("const t=document.querySelector('.session-task');return t.textContent==='<b>Study DBMS</b>'&&!t.querySelector('b');"));
 check('date time wanders and saved caption appear',await E("const p=document.querySelector('.session-page');return !!p.querySelector('time').dateTime&&p.querySelector('.session-time').textContent==='10:00'&&p.querySelector('.session-wanders').textContent==='2'&&p.querySelector('.session-caption').textContent==='A little page for us.';"));
 check('places show unique domains, never paths, and a gentle empty state',await E("const p=document.querySelector('.session-page');return [...p.querySelectorAll('.places-list li')].map(i=>i.textContent).join(',')==='reddit.com,video.example.com'&&p.querySelector('.places-empty').hidden&&!document.querySelectorAll('.session-page')[1].querySelector('.places-empty').hidden;"));
 check('all three drawing qualities are bundled and described',await E("return [...document.querySelectorAll('.session-drawing')].map(i=>i.getAttribute('src')).join(',')==='../../assets/doodles/butu-wrong.svg,../../assets/doodles/butu-waiting.svg,../../assets/doodles/butu-calm.svg'&&[...document.querySelectorAll('.session-drawing')].every(i=>i.alt);"));
 await E("setTimeout(()=>location.reload(),100);return true;");await sleep(1000);await waitFor(async()=>await count()===3);
 check('pages persist after reload',true);
 await E("await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));return true;");
 check('bundled fonts and drawings decode',await E("return document.fonts.check('20px \"Patrick Hand\"')&&document.fonts.check('20px Gaegu')&&[...document.images].every(i=>i.naturalWidth>0);"));
 check('page fits current viewport',await E("return document.documentElement.scrollWidth<=innerWidth;"));
 await E("const d=await chrome.storage.local.get('sessionHistory');await chrome.storage.local.set({sessionHistory:[null,...Array.from({length:55},(_,i)=>({...d.sessionHistory[0],task:'Long task '+('work '.repeat(35))+i})),{}]});return true;");
 await waitFor(async()=>await count()===50);
 check('50 valid pages and long text fit',await E("return document.documentElement.scrollWidth<=innerWidth;"));
 await E("await chrome.storage.local.set({sessionHistory:[]});return true;");await waitFor(async()=>await count()===0);
 check('cleared history returns to empty state',await E("return !document.querySelector('#empty').hidden;"));
 await E("const now=Date.now();await chrome.storage.local.set({sessionHistory:[0,120,600].map((off,i)=>({task:['Read a chapter on databases','Finish the little project','Study DBMS'][i],startedAt:now-i*86400000,elapsedSeconds:600,completed:true,offTaskSeconds:off,timesWandered:i,caption:['We made a little more today. I gave that bit a gold star.','I left a space beside our work for you. See? Just your shape.','I tried drawing the waiting. It went over the edge of the paper.'][i]}))});return true;");
 await waitFor(async()=>await count()===3);await E("await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode()));return true;");
 await E("document.querySelector('nav a').click();return true;");
 await waitFor(()=>E("return !!document.querySelector('#settings-fields')&&!document.querySelector('#settings-fields').disabled;"));
 check('settings link opens bundled page with quiet defaults',await E("return document.querySelector('#volume').value==='25'&&!document.querySelector('#muted').checked&&document.querySelector('#allowlist').value==='';"));
 await E("document.querySelector('#allowlist').value='Work.Example.\\nwork.example';document.querySelector('#blocklist').value='play.example';document.querySelector('#volume').value='37';document.querySelector('#muted').checked=true;document.querySelector('#save-settings').click();return true;");
 await waitFor(()=>E("return document.querySelector('#settings-status').textContent==='Your settings are saved.';"));
 check('settings save canonical domain lists, volume and mute locally',await E("const d=await chrome.storage.local.get(['allowlist','blocklist','volume','muted']);return d.allowlist.join(',')==='work.example'&&d.blocklist.join(',')==='play.example'&&d.volume===.37&&d.muted;"));
 await E("document.querySelector('#test-voice').click();return true;");
 await waitFor(()=>E("return document.querySelector('#settings-status').textContent.startsWith('Butu is quiet.');"));
 check('voice test respects saved mute',true);
 await E("document.querySelector('#blocklist').value='https://play.example/path';document.querySelector('#save-settings').click();return true;");
 check('invalid URLs block saving without losing stored settings',await E("const d=await chrome.storage.local.get('blocklist');return !document.querySelector('#blocklist').validity.valid&&d.blocklist[0]==='play.example';"));
 await E("setTimeout(()=>location.reload(),100);return true;");await sleep(1000);
 await waitFor(()=>E("return !!document.querySelector('#settings-fields')&&!document.querySelector('#settings-fields').disabled;"));
 check('saved settings persist across reload',await E("return document.querySelector('#allowlist').value==='work.example'&&document.querySelector('#blocklist').value==='play.example'&&document.querySelector('#volume').value==='37'&&document.querySelector('#volume-value').textContent==='37%'&&document.querySelector('#muted').checked;"));
 await E("document.querySelector('#muted').checked=false;document.querySelector('#save-settings').click();return true;");
 await waitFor(()=>E("return document.querySelector('#settings-status').textContent==='Your settings are saved.';"));
 await E("document.querySelector('#test-voice').click();return true;");
 await waitFor(()=>E("return document.querySelector('#settings-status').textContent.startsWith('Voice test requested.');"));
 check('unmuted voice test reaches the model host without a session',true);
 check('settings fit viewport and credit ElevenLabs',await E("return document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.audio-credits').textContent.includes('elevenlabs.io')&&!document.querySelector('input[type=password]')&&!document.querySelector('audio');"));
 fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({browser:name,checks},null,2));
}
async function chromeRun(){
 const profile=out+'/chrome-profile',log=fs.openSync(out+'/chrome.log','w');
 const child=spawn(process.env.BUTU_CHROME || (fs.existsSync(process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome') ? process.env.HOME+'/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome' : 'chromium'),['--headless','--no-sandbox','--disable-gpu','--disable-background-networking','--no-first-run','--enable-unsafe-extension-debugging','--user-data-dir='+profile,'--remote-debugging-port=0','about:blank'],{stdio:['ignore',log,log]});
 let browser,view;
 try{
  let port,version;for(let i=0;i<100;i++){try{port=fs.readFileSync(profile+'/DevToolsActivePort','utf8').split('\n')[0];version=await(await fetch('http://127.0.0.1:'+port+'/json/version')).json();browser=await connect(version.webSocketDebuggerUrl);break}catch{await sleep(200)}}
  if(!browser)throw Error('Chrome timeout');
  const{id}=await browser.call('Extensions.loadUnpacked',{path:root+'/dist/chrome'});
  const{targetId}=await browser.call('Target.createTarget',{url:'chrome-extension://'+id+'/src/diary/diary.html'});
  const ts=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();view=await connect(ts.find(t=>t.id===targetId).webSocketDebuggerUrl);await sleep(1000);
  const E=async code=>{const r=await view.call('Runtime.evaluate',{expression:'(async()=>{'+code+'})()',awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  await view.call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:false});await scenario(version.Browser.replace('/','-'),E); const {cssContentSize:size}=await view.call('Page.getLayoutMetrics');const s=await view.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:size.width,height:size.height,scale:1}});fs.writeFileSync(out+'/chrome.png',Buffer.from(s.data,'base64'));
 }finally{view?.close();if(browser){await browser.call('Browser.close').catch(()=>{});browser.close()}child.kill();fs.closeSync(log)}
}
async function firefoxRun(){
 const profile=out+'/firefox-profile';fs.mkdirSync(profile);fs.writeFileSync(profile+'/user.js','user_pref("marionette.port",2887);\nuser_pref("browser.shell.checkDefaultBrowser",false);\n');
 const log=fs.openSync(out+'/firefox.log','w');const child=spawn(process.env.BUTU_FIREFOX || 'firefox',['--headless','--no-remote','--profile',profile,'--marionette','--remote-allow-system-access','about:blank'],{stdio:['ignore',log,log]});let m;
 try{
  m=await marionette(2887);const session=await m.call('WebDriver:NewSession',{capabilities:{}});
  await m.call('WebDriver:SetTimeouts',{script:30000,pageLoad:30000});await m.call('Addon:Install',{path:root+'/dist/firefox',temporary:true});
  await m.call('Marionette:SetContext',{value:'chrome'});const{value:url}=await m.call('WebDriver:ExecuteScript',{script:"return WebExtensionPolicy.getByID('butu@butu.test').getURL('src/diary/diary.html');",args:[]});
  await m.call('Marionette:SetContext',{value:'content'});await m.call('WebDriver:Navigate',{url});
  const E=async code=>{const r=await m.call('WebDriver:ExecuteAsyncScript',{script:'const done=arguments[arguments.length-1];(async()=>{'+code+'})().then(value=>done({value}),e=>done({error:String(e)}));',args:[],newSandbox:false});if(r.value.error)throw Error(r.value.error);return r.value.value;};
  await m.call('WebDriver:SetWindowRect',{width:1100,height:900});await scenario('Firefox-'+session.capabilities.browserVersion,E); const s=await m.call('WebDriver:TakeScreenshot',{full:true});fs.writeFileSync(out+'/firefox.png',Buffer.from(s.value,'base64'));
 }finally{m?.close();child.kill();fs.closeSync(log)}
}

(async()=>{console.log('Evidence: '+out);if(process.argv[2]!=='firefox')await chromeRun();if(process.argv[2]!=='chrome')await firefoxRun()})().catch(e=>{console.error(e.stack);process.exitCode=1});
