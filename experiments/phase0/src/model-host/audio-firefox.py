"""Firefox/Marionette audio probe, stdlib only; isolated profile, default autoplay policy."""
import json
import os
import pathlib
import shutil
import socket
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[4]
out = pathlib.Path(os.environ.get('BUTU_AUDIO_RESULTS', '/tmp/butu-audio-firefox'))
out.mkdir(parents=True, exist_ok=True)
profile = out / 'profile'
if profile.exists():
    raise RuntimeError('Use a fresh BUTU_AUDIO_RESULTS directory for an isolated test')
profile.mkdir()
(profile / 'user.js').write_text('user_pref("marionette.port", 2841);\n'
    'user_pref("devtools.console.stdout.content", true);\n'
    'user_pref("devtools.console.stdout.chrome", true);\n'
    'user_pref("browser.shell.checkDefaultBrowser", false);\n'
    'user_pref("browser.startup.homepage_override.mstone", "ignore");\n'
    'user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);\n')
fixture = out / 'extension'
fixture.mkdir()
source = root / 'experiments/phase0'
for name in ['manifest.json', 'background.html', 'background.js']:
    shutil.copy2(source / name, fixture / name)
for name in ['src', 'vendor']:
    shutil.copytree(source / name, fixture / name)
shutil.copytree(source / 'assets', fixture / 'assets')
# Isolate audio from the embedding benchmark; leave autoplay and idle defaults alone.
(fixture / 'background.js').write_text("import './src/model-host/audio-probe.js';\n")
probe = fixture / 'src/model-host/audio-probe.js'
with probe.open('a') as file:
    file.write("""
for (const type of ['playing', 'ended', 'error']) audio.addEventListener(type, () => {
    console.log('[audio-probe]', JSON.stringify({type, time:audio.currentTime,
        duration:audio.duration, src:audio.currentSrc, volume:audio.volume,
        muted:audio.muted, activation:navigator.userActivation.hasBeenActive}));
});
""")
(fixture / 'src/model-host/audio-sender.js').write_text("""
setTimeout(async () => {
    const reply = await chrome.runtime.sendMessage({type:'phase0:play-audio'});
    console.log('[audio-reply]', JSON.stringify(reply));
}, 5000);
""")
with (fixture / 'src/model-host/audio-test.html').open('a') as file:
    file.write('<script src="audio-sender.js"></script>')
log = (out / 'browser.log').open('w')
child = subprocess.Popen([os.environ.get('BUTU_FIREFOX', 'firefox'), '--no-remote',
    '--profile', str(profile), '--marionette', '--remote-allow-system-access', 'about:blank'], stdout=log, stderr=log)
result = {'events': []}
try:
    for _ in range(100):
        try:
            connection = socket.create_connection(('127.0.0.1', 2841), timeout=2)
            break
        except OSError:
            time.sleep(.2)
    else:
        raise RuntimeError('Cannot connect to test Firefox')
    connection.settimeout(120)
    def read():
        size = b''
        while (part := connection.recv(1)) != b':':
            if not part:
                raise RuntimeError('Marionette closed')
            size += part
        data = b''
        while len(data) < int(size):
            part = connection.recv(int(size) - len(data))
            if not part:
                raise RuntimeError('Marionette truncated')
            data += part
        return json.loads(data)
    read()
    sequence = 0
    def call(name, arguments=None):
        global sequence
        print(name, flush=True)
        sequence += 1
        data = json.dumps([0, sequence, name, arguments or {}]).encode()
        connection.sendall(str(len(data)).encode() + b':' + data)
        response = read()
        if response[2]:
            raise RuntimeError(response[2])
        return response[3]
    def script(code):
        return call('WebDriver:ExecuteScript', {'script': code, 'args': [], 'newSandbox': False})['value']
    session = call('WebDriver:NewSession', {'capabilities': {}})
    if session['capabilities']['moz:processID'] != child.pid:
        raise RuntimeError('Wrong browser')
    result['browser'] = session['capabilities']['browserVersion']
    call('Marionette:SetContext', {'value': 'chrome'})
    call('Addon:Install', {'path': str(fixture), 'temporary': True})
    uuid = script("return JSON.parse(Services.prefs.getStringPref('extensions.webextensions.uuids'))['phase0@butu.test']")
    call('Marionette:SetContext', {'value': 'content'})
    call('WebDriver:Navigate', {'url': f'moz-extension://{uuid}/src/model-host/audio-test.html'})
    call('WebDriver:NewWindow', {'type': 'tab', 'focus': True})
    handles = call('WebDriver:GetWindowHandles')
    call('WebDriver:SwitchToWindow', {'handle': handles[-1]})
    call('WebDriver:Navigate', {'url': 'http://127.0.0.1:8769/'})
    focus = "return {focused:document.hasFocus(),visible:document.visibilityState,url:location.href,activation:navigator.userActivation.hasBeenActive}"
    result['focusBefore'] = script(focus)
    deadline = time.monotonic() + 15
    while time.monotonic() < deadline:
        result['events'] = []
        for line in (out / 'browser.log').read_text().splitlines():
            for marker, key in [('console.log: "[audio-probe]" ', 'events'), ('console.log: "[audio-reply]" ', 'reply')]:
                if marker in line:
                    value = json.loads(json.loads(line.split(marker, 1)[1]))
                    if key == 'events': result[key].append(value)
                    else: result[key] = value
        if any(e['type'] == 'ended' for e in result['events']): break
        time.sleep(.2)
    result['focusAfter'] = script(focus)
    assert result.get('reply', {}).get('playing'), result
    assert any(e['type'] == 'playing' for e in result['events']), result
    assert any(e['type'] == 'ended' for e in result['events']), result
    assert all(not e['activation'] and not e['muted'] for e in result['events']), result
    assert all(result[k]['focused'] and result[k]['visible'] == 'visible' and not result[k]['activation'] for k in ['focusBefore', 'focusAfter']), result
    result['pass'] = True
    print(json.dumps(result), flush=True)
except Exception as error:
    result['error'] = str(error)
    raise
finally:
    (out / 'result.json').write_text(json.dumps(result, indent=2))
    if child.poll() is None:
        child.terminate()
        try: child.wait(timeout=15)
        except subprocess.TimeoutExpired: child.kill()
    log.close()
