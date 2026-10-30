const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

test('original SFX are deterministic, quiet, finite, and end in silence', async () => {
    const { renderSfx, SFX_CLIPS, SFX_SAMPLE_RATE } = await import('../src/lib/sfx.js');
    assert.throws(() => renderSfx('unknown'), RangeError);
    for (const clip of SFX_CLIPS) {
        const samples = renderSfx(clip.name);
        assert.equal(samples.length, clip.duration_seconds * SFX_SAMPLE_RATE);
        let peak = 0;
        for (const sample of samples) {
            assert.ok(Number.isFinite(sample));
            peak = Math.max(peak, Math.abs(sample));
        }
        assert.ok(peak > 0.03 && peak < 0.3);
        assert.equal(samples[0], 0);
        assert.ok(samples.slice(-1000).every(sample => sample === 0));
        assert.deepEqual(samples, renderSfx(clip.name));
    }
});

test('SFX preflight, reservation, no-retry stop, offline fallback and overwrite guard', async t => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'butu-sfx-test-'));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const mock = path.join(temporary, 'mock.cjs');
    await fs.writeFile(mock, `
const assert = require('node:assert/strict');
const fs = require('node:fs');
process.loadEnvFile = () => {};
const mode = process.env.SFX_TEST;
let calls = 0;
let checks = 0;
// Encoding is tested separately against the real FFmpeg; keep quota checks quick.
require('node:child_process').spawnSync = (command, args) => {
    if (args[0] === '-version') return { status: 0, stdout: 'mock encoder' };
    fs.writeFileSync(args.at(-1), 'local-mp3');
    return { status: 0 };
};
global.fetch = async (url, options) => {
    assert.notEqual(mode, 'local', 'offline mode must not fetch');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['xi-api-key'], 'fake-secret');
    if (url.endsWith('/v1/user/subscription')) {
        checks++;
        return Response.json({ tier: mode === 'paid' ? 'starter' : 'free',
            can_extend_character_limit: mode === 'overages',
            character_count: mode === 'changed-quota' && checks > 1 ? 9999 : 0,
            character_limit: mode === 'quota' ? 199 : mode === 'invalid' ? '10000' : 10000 });
    }
    assert.ok(['ok', 'http', 'changed-quota', 'timeout', 'bad-audio'].includes(mode));
    assert.equal(url, 'https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128');
    assert.ok(++calls <= (mode === 'ok' ? 2 : 1), 'no retry or next request after failure');
    const body = JSON.parse(options.body);
    assert.equal(body.model_id, 'eleven_text_to_sound_v2');
    assert.equal(body.loop, false);
    const manifest = JSON.parse(fs.readFileSync(require('node:path').join(process.argv[3], 'manifest.json')));
    assert.equal(manifest.api_requests, calls, 'persist before dispatch');
    assert.equal(manifest.reserved_credits, calls === 1 ? 120 : 200);
    assert.equal(manifest.clips[calls - 1].status, 'request-started');
    if (mode === 'timeout') throw new Error('fake-secret timeout');
    if (mode === 'http') return Response.json({ detail: { status: 'feature_unavailable', message: 'fake-secret' } }, { status: 403 });
    return new Response('api-mp3', { headers: { 'content-type': mode === 'bad-audio' ? 'application/json' : 'audio/mpeg', 'character-cost': '33' } });
};
`);
    const run = (directory, mode) => spawnSync(process.execPath, ['--require', mock,
        'scripts/audio/sfx', 'generate', directory, ...(mode === 'local' ? ['--local'] : [])],
    { encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: 'fake-secret', SFX_TEST: mode } });
    for (const mode of ['ok', 'paid', 'overages', 'quota', 'invalid', 'http', 'timeout', 'bad-audio', 'changed-quota', 'local']) {
        const directory = path.join(temporary, mode);
        const result = run(directory, mode);
        assert.equal(result.status, 0, result.stderr);
        const manifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json')));
        assert.equal(manifest.api_requests, mode === 'ok' ? 2 : ['http', 'timeout', 'bad-audio', 'changed-quota'].includes(mode) ? 1 : 0, mode);
        assert.equal(manifest.reserved_credits, manifest.api_requests === 2 ? 200 : manifest.api_requests === 1 ? 120 : 0);
        assert.ok(!JSON.stringify(manifest).includes('fake-secret'));
        assert.equal(manifest.status, mode === 'ok' ? 'api-ready-for-listening' : 'local-fallback');
        for (const clip of manifest.clips) {
            assert.equal(await fs.readFile(path.join(directory, clip.fallback), 'utf8'), 'local-mp3');
            assert.equal(await fs.readFile(path.join(directory, clip.file), 'utf8'), clip.status === 'saved' ? 'api-mp3' : 'local-mp3');
        }
        assert.notEqual(run(directory, mode).status, 0, 'existing output is protected');
    }
});
