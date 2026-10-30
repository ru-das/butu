const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('free-profile previews reject paid accounts/features, preserve reservations, and select locally', async (t) => {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'butu-free-voice-'));
    t.after(() => fs.rm(temporary, { recursive: true, force: true }));
    const project = path.join(temporary, 'project');
    await fs.mkdir(path.join(project, 'scripts/audio'), { recursive: true });
    await fs.mkdir(path.join(project, 'src/lib'), { recursive: true });
    await fs.copyFile('scripts/audio/voice-preview', path.join(project, 'scripts/audio/voice-preview'));
    const config = (await fs.readFile('src/config.js', 'utf8')).replace(/export const ELEVENLABS_VOICE_ID = .*?;/, 'export const ELEVENLABS_VOICE_ID = null;');
    await fs.writeFile(path.join(project, 'src/config.js'), config);
    await fs.copyFile('src/lib/voice-budget.js', path.join(project, 'src/lib/voice-budget.js'));
    const mock = path.join(temporary, 'mock.cjs');
    await fs.writeFile(mock, `
const assert = require('node:assert/strict');
Date.now = () => Date.UTC(2026, 9, 30);
process.loadEnvFile = () => {}; // Tests never read a real credential file.
const ids = ['EXAVITQu4vr4xnSDxMaL', 'XrExE9yKIg1WjnnlVkGX', 'pFZP5JQG7iQjIQuC4Bku'];
let speechCalls = 0;
const mode = process.env.VOICE_TEST;
global.fetch = async (url, options) => {
    assert.notEqual(mode, 'select', 'selection must never call the API');
    assert.equal(options.redirect, 'error');
    assert.equal(options.headers['xi-api-key'], 'fake-secret');
    if (url.endsWith('/v1/user/subscription')) return Response.json({
        tier: mode === 'paid' ? 'starter' : 'free', can_extend_character_limit: mode === 'overages',
        character_count: 0, character_limit: mode === 'quota' ? 1 : 10000,
    });
    if (url.endsWith('/v2/voices?page_size=100&category=premade')) return Response.json({
        voices: ids.map(voice_id => ({ voice_id, category: mode === 'library' ? 'professional' : 'premade' })),
    });
    assert.ok(['ok', 'http'].includes(mode), 'no speech allowed for rejected preflight');
    assert.ok(url.startsWith('https://api.elevenlabs.io/v1/text-to-speech/'), 'only standard TTS');
    assert.ok(url.endsWith('?output_format=mp3_44100_128'));
    assert.ok(speechCalls++ < 3, 'no automatic retry');
    const body = JSON.parse(options.body);
    assert.equal(body.model_id, 'eleven_multilingual_v2');
    assert.equal(body.voice_settings.speed, 0.85);
    if (mode === 'http') return Response.json({ detail: { status: 'paid_plan_required', message: 'fake-secret' } }, { status: 402 });
    return new Response('mock-mp3', { headers: { 'Content-Type': 'audio/mpeg', 'character-cost': String(body.text.length) } });
};
`);
    const script = path.join(project, 'scripts/audio/voice-preview');
    const run = (args, mode) => spawnSync(process.execPath, ['--require', mock, script, ...args], {
        encoding: 'utf8', env: { ...process.env, ELEVENLABS_API_KEY: 'fake-secret', VOICE_TEST: mode },
    });
    const output = path.join(temporary, 'ok');
    const good = run(['generate', output], 'ok');
    assert.equal(good.status, 0, good.stderr);
    const manifest = JSON.parse(await fs.readFile(path.join(output, 'manifest.json')));
    assert.equal(manifest.status, 'ready-for-listening');
    assert.equal(manifest.previews.length, 3);
    assert.equal(manifest.reserved_characters, manifest.text.length * 3);
    assert.ok(!JSON.stringify(manifest).includes('fake-secret'));
    for (const preview of manifest.previews) {
        assert.equal(preview.reported_character_cost, String(manifest.text.length));
        assert.equal(await fs.readFile(path.join(output, preview.file), 'utf8'), 'mock-mp3');
    }
    assert.notEqual(run(['generate', output], 'ok').status, 0, 'refuse overwrites');
    for (const mode of ['paid', 'overages', 'quota', 'library', 'http']) {
        const directory = path.join(temporary, mode);
        const failed = run(['generate', directory], mode);
        assert.notEqual(failed.status, 0, mode);
        const failedManifest = JSON.parse(await fs.readFile(path.join(directory, 'manifest.json')));
        assert.equal(failedManifest.status, 'stopped');
        assert.equal(failedManifest.reserved_characters, mode === 'http' ? manifest.text.length : 0);
        assert.equal(failedManifest.previews.length, mode === 'http' ? 1 : 0);
        assert.ok(!failed.stderr.includes('fake-secret'));
    }
    const selection = run(['select', output, '1'], 'select');
    assert.equal(selection.status, 0, selection.stderr);
    assert.match(await fs.readFile(path.join(project, 'src/config.js'), 'utf8'), /ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'/);
    assert.notEqual(run(['select', output, '1'], 'select').status, 0, 'selection is not repeated');
});
