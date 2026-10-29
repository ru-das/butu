// Node 22, stdlib only. Run after prepare.sh on an isolated DISPLAY; no autoplay overrides.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(__dirname, '../../../..');
const output = process.env.BUTU_AUDIO_RESULTS ?? '/tmp/butu-audio-chrome';
fs.mkdirSync(output, { recursive: true });
const profile = path.join(output, 'profile');
if (fs.existsSync(profile)) throw Error('Use a fresh BUTU_AUDIO_RESULTS directory');
const fixture = path.join(output, 'extension');
fs.cpSync(path.join(root, 'experiments/phase0/chrome'), fixture, { recursive: true });
// Isolate playback from the already-verified embedding benchmark/download.
fs.writeFileSync(path.join(fixture, 'background.js'), "import './src/model-host/audio-probe.js';\n");
async function connect(url, onEvent = () => {}) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let sequence = 0;
    const pending = new Map();
    socket.onmessage = ({ data }) => {
        const message = JSON.parse(data);
        if (!message.id) return onEvent(message);
        const waiter = pending.get(message.id);
        pending.delete(message.id);
        if (waiter) message.error ? waiter.reject(message.error) : waiter.resolve(message.result);
    };
    return {
        call(method, params = {}) {
            return new Promise((resolve, reject) => {
                const id = ++sequence;
                pending.set(id, { resolve, reject });
                socket.send(JSON.stringify({ id, method, params }));
            });
        },
        close() { socket.close(); },
    };
}
(async () => {
 const log = fs.openSync(path.join(output, 'browser.log'), 'w');
 const child = spawn(process.env.BUTU_CHROME, ['--no-sandbox', '--disable-gpu', '--no-first-run',
 '--disable-background-networking', '--enable-unsafe-extension-debugging',
 `--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'], {stdio:['ignore',log,log]});
 const result = {};
 let browser, sender, website, host;
 try {
 let endpoint;
 for(let i=0;i<100;i++){
  try{
   const port=fs.readFileSync(path.join(profile,'DevToolsActivePort'),'utf8').split('\n')[0];
   endpoint=`http://127.0.0.1:${Number(port)}`;
   const version=await (await fetch(`${endpoint}/json/version`)).json();
   browser=await connect(version.webSocketDebuggerUrl); result.browser=version.Browser; break;
  }catch{await pause(200)}
 }
 if(!browser)throw Error('No debugger');
 await browser.call('Extensions.loadUnpacked',{path:fixture});
 let target;
 for(let i=0;i<100;i++){
  target=(await (await fetch(`${endpoint}/json/list`)).json()).find(t=>t.url.endsWith('/offscreen.html'));
  if(target)break; await pause(100);
 }
 if(!target)throw Error('No offscreen host');
 host=await connect(target.webSocketDebuggerUrl);
 // Observe the actual native media element without changing its autoplay policy.
 await host.call('Runtime.evaluate',{expression:`globalThis.probeAudio=document.querySelector('audio');
 globalThis.audioEvents=[]; // Audio() is detached; capture it via the native play method.
 const original=HTMLMediaElement.prototype.play;
 HTMLMediaElement.prototype.play=function(){globalThis.probeAudio=this;
 for(const type of ['playing','ended','error'])this.addEventListener(type,()=>audioEvents.push({type,time:this.currentTime,muted:this.muted,volume:this.volume}));
 return original.call(this);};`});
 async function open(url){
  const {targetId}=await browser.call('Target.createTarget',{url});
  const list=await (await fetch(`${endpoint}/json/list`)).json();
  const page=await connect(list.find(t=>t.id===targetId).webSocketDebuggerUrl);
  await pause(500); return page;
 }
 sender=await open(`chrome-extension://${new URL(target.url).host}/src/model-host/audio-test.html`);
 website=await open('http://127.0.0.1:8769/');
 await website.call('Page.bringToFront');
 const evaluate=async(page,expression)=>{
  const value=await page.call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:false});
  if(value.exceptionDetails)throw Error(JSON.stringify(value.exceptionDetails)); return value.result.value;
 };
 result.focusBefore=await evaluate(website,'({focused:document.hasFocus(),visible:document.visibilityState,url:location.href,activation:navigator.userActivation.hasBeenActive})');
 result.reply=await evaluate(sender,"chrome.runtime.sendMessage({type:'phase0:play-audio'})");
 for (let i=0;i<100;i++) {
 if(await evaluate(host,'!!probeAudio?.ended'))break;
 await pause(200);
 }
 result.media=await evaluate(host,'({events:audioEvents,src:probeAudio.currentSrc,ended:probeAudio.ended,time:probeAudio.currentTime,duration:probeAudio.duration,activation:navigator.userActivation.hasBeenActive})');
 result.focusAfter=await evaluate(website,'({focused:document.hasFocus(),visible:document.visibilityState,activation:navigator.userActivation.hasBeenActive})');
 if(!result.reply.playing||!result.media.ended||!result.media.events.some(e=>e.type==='playing')||!result.focusBefore.focused||!result.focusAfter.focused||result.focusBefore.activation||result.focusAfter.activation||result.media.activation)throw Error('Audio/focus assertion failed');
 result.pass=true; console.log(JSON.stringify(result));
 }catch(error){result.error=String(error);process.exitCode=1;console.error(error)}
 finally{
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));
 for(const page of [sender,website,host])page?.close();
 if(browser){await browser.call('Browser.close').catch(()=>{});browser.close()}
 if(child.exitCode===null)child.kill();fs.closeSync(log);
 }
})();
