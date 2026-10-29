"""Firefox endurance check, stdlib/Marionette; no extension inspector or idle override.

Run prepare.sh first. Optional BUTU_LIFETIME_CACHE_PROFILE copies only test-profile
prefs/model cache; BUTU_LIFETIME_RESULTS must name a fresh output directory.
"""
import json
import os
import pathlib
import shutil
import socket
import subprocess
import time

root = pathlib.Path(__file__).resolve().parents[4]
out = pathlib.Path(os.environ.get('BUTU_LIFETIME_RESULTS', '/tmp/butu-lifetime-endurance'))
out.mkdir(parents=True, exist_ok=False)
profile = out / 'profile'
profile.mkdir()
cached = os.environ.get('BUTU_LIFETIME_CACHE_PROFILE')
if cached:
    cached = pathlib.Path(cached)
    shutil.copy2(cached / 'prefs.js', profile / 'prefs.js')
    shutil.copytree(cached / 'storage', profile / 'storage')
    # Preserve cache-origin UUIDs, never inherit idle/autoplay overrides.
    prefs = (profile / 'prefs.js').read_text().splitlines()
    (profile / 'prefs.js').write_text('\n'.join(line for line in prefs
        if 'extensions.webextensions.uuids' in line) + '\n')
(profile / 'user.js').write_text('user_pref("marionette.port", 2842);\n'
    'user_pref("browser.shell.checkDefaultBrowser", false);\n'
    'user_pref("browser.startup.homepage_override.mstone", "ignore");\n'
    'user_pref("datareporting.policy.dataSubmissionPolicyBypassNotification", true);\n')
fixture = out / 'extension'
source = root / 'experiments/phase0'
fixture.mkdir()
for name in ['manifest.json', 'background.html']:
    shutil.copy2(source / name, fixture / name)
for name in ['src', 'vendor', 'assets']:
    shutil.copytree(source / name, fixture / name)
# Isolate the session probe from the eager historical ranking benchmark.
(fixture / 'background.js').write_text('// Endurance fixture: lazy session probe only.\n')
log = (out / 'browser.log').open('w')
child = subprocess.Popen([os.environ.get('BUTU_FIREFOX', 'firefox'), '--no-remote',
    '--profile', str(profile), '--marionette', '--remote-allow-system-access', 'about:blank'],
    stdout=log, stderr=log)
result = {'samples': [], 'cacheProfileUsed': bool(cached)}
try:
    for _ in range(150):
        try:
            connection = socket.create_connection(('127.0.0.1', 2842), timeout=2)
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
                raise RuntimeError('Marionette response truncated')
            data += part
        return json.loads(data)
    read()
    sequence = 0
    def call(name, arguments=None):
        global sequence
        sequence += 1
        data = json.dumps([0, sequence, name, arguments or {}]).encode()
        connection.sendall(str(len(data)).encode() + b':' + data)
        response = read()
        if response[2]:
            raise RuntimeError(response[2])
        return response[3]
    def script(code):
        return call('WebDriver:ExecuteScript', {'script': code, 'args': [], 'newSandbox': False})['value']
    def context(name):
        call('Marionette:SetContext', {'value': name})
    session = call('WebDriver:NewSession', {'capabilities': {}})
    assert session['capabilities']['moz:processID'] == child.pid
    result['browser'] = session['capabilities']['browserVersion']
    call('WebDriver:SetTimeouts', {'script': 120000})
    context('chrome')
    result['idleTimeoutMs'] = script("return Services.prefs.getIntPref('extensions.background.idle.timeout', 30000)")
    assert result['idleTimeoutMs'] == 30000
    call('Addon:Install', {'path': str(fixture), 'temporary': True})
    uuid = script("return JSON.parse(Services.prefs.getStringPref('extensions.webextensions.uuids'))['phase0@butu.test']")
    state = """const {ExtensionParent: ep} = ChromeUtils.importESModule('resource://gre/modules/ExtensionParent.sys.mjs');
        const extension = ep.GlobalManager.extensionMap.get('phase0@butu.test');
        return {state: extension.backgroundState,
            debuggerAttached: ep.DebugUtils.hasDevToolsAttached(extension.id),
            views: [...extension.views].map(v => v.viewType)};"""
    def status():
        context('chrome')
        return script(state)
    def open_sender():
        context('content')
        call('WebDriver:Navigate', {'url': f'moz-extension://{uuid}/src/model-host/lifetime-test.html'})
    def close_sender():
        context('content')
        call('WebDriver:Navigate', {'url': 'about:blank'})
    def send(action, **extra):
        context('content')
        message = {'type': f'phase0:lifetime-{action}', **extra}
        reply = call('WebDriver:ExecuteAsyncScript', {'script':
            'const done=arguments[arguments.length-1]; chrome.runtime.sendMessage(arguments[0]).then(done, e=>done({error:String(e)}));',
            'args': [message], 'newSandbox': False})['value']
        assert reply and 'error' not in reply, reply
        return reply
    def quiet(seconds, expected='running'):
        deadline = time.monotonic() + seconds
        while time.monotonic() < deadline:
            time.sleep(min(30, max(0, deadline - time.monotonic())))
            sample = {'elapsedSeconds': round(time.monotonic() - started, 2), **status()}
            result['samples'].append(sample)
            assert not sample['debuggerAttached'], sample
            assert all(view == 'background' for view in sample['views']), sample
            if expected:
                assert sample['state'] == expected, sample
            print(json.dumps(sample), flush=True)
    open_sender()
    result['start'] = send('start', endsAt=int(time.time() * 1000) + 900000)
    instance = result['start']['instance']
    result['firstEmbedding'] = send('compare', title='Third normal form explained')
    result['loopStart'] = send('audio', loop=True)
    assert not result['loopStart']['audio']['paused']
    close_sender()
    started = time.monotonic()
    print('Session running; beginning 11-minute endurance interval', flush=True)
    quiet(75)
    open_sender()
    result['loopAfter75Seconds'] = send('status')
    assert result['loopAfter75Seconds']['instance'] == instance
    assert not result['loopAfter75Seconds']['audio']['paused']
    assert not result['loopAfter75Seconds']['workerLoaded'], 'idle worker retained'
    # Stop looping by replacing it with one finite clip. The host then stays silent.
    result['finiteClip'] = send('audio')
    close_sender()
    quiet(max(0, 665 - (time.monotonic() - started)))
    open_sender()
    result['after11Minutes'] = send('status')
    assert result['after11Minutes']['instance'] == instance
    assert result['after11Minutes']['audio']['ended']
    assert any(e['type'] == 'ended' for e in result['after11Minutes']['audio']['events'])
    assert not result['after11Minutes']['workerLoaded']
    result['lateEmbedding'] = send('compare', title='Functional dependencies tutorial')
    assert not result['lateEmbedding']['result']['cached']
    result['lateAudio'] = send('audio')
    assert not result['lateAudio']['audio']['paused']
    result['manualStop'] = send('stop')
    assert not result['manualStop']['workerLoaded']
    assert result['manualStop']['cacheEntries'] == 0
    assert result['manualStop']['audio']['paused']
    close_sender()
    quiet(45, expected=None)
    result['afterStop'] = status()
    assert result['afterStop']['state'] == 'stopped'
    open_sender()
    result['afterWake'] = send('status')
    assert result['afterWake']['instance'] != instance
    assert result['afterWake']['endsAt'] is None
    result['expiryStart'] = send('start', endsAt=int(time.time() * 1000) + 5000)
    result['expiryAudio'] = send('audio', loop=True)
    time.sleep(7)
    result['expired'] = send('status')
    assert result['expired']['endsAt'] is None
    assert result['expired']['endReason'] == 'expired'
    assert result['expired']['audio']['paused']
    close_sender()
    quiet(45, expected=None)
    result['afterExpiry'] = status()
    assert result['afterExpiry']['state'] == 'stopped'
    result['enduranceSeconds'] = 665
    result['pass'] = True
    print('PASS', flush=True)
except Exception as error:
    result['error'] = str(error)
    raise
finally:
    # Always stop the browser, even if writing the report encounters disk errors.
    if child.poll() is None:
        child.terminate()
        try:
            child.wait(timeout=15)
        except subprocess.TimeoutExpired:
            child.kill()
            child.wait()
    log.close()
    (out / 'result.json').write_text(json.dumps(result, indent=2))
