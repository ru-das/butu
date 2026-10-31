import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

test('build copies both manifests and local trees, and removes stale output', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'butu-build-'));
  try {
    cpSync(join(root, 'build.sh'), join(fixture, 'build.sh'));
    cpSync(join(root, 'manifests'), join(fixture, 'manifests'), { recursive: true });
    for (const tree of ['src', 'vendor', 'assets']) {
      mkdirSync(join(fixture, tree));
      writeFileSync(join(fixture, tree, 'fixture.txt'), tree);
    }
    mkdirSync(join(fixture, 'src/model-host'));
    for (const browser of ['chrome', 'firefox']) {
      cpSync(join(root, `src/model-host/client-${browser}.js`),
        join(fixture, `src/model-host/client-${browser}.js`));
    }
    for (const file of ['offscreen.html', 'offscreen.js']) {
      writeFileSync(join(fixture, 'src/model-host', file), 'Chrome only');
    }
    execFileSync('sh', [join(fixture, 'build.sh')], { cwd: tmpdir() });
    for (const browser of ['chrome', 'firefox']) {
      const output = join(fixture, 'dist', browser);
      assert.equal(readFileSync(join(output, 'manifest.json'), 'utf8'),
        readFileSync(join(root, 'manifests', `${browser}.json`), 'utf8'));
      const manifest = JSON.parse(readFileSync(join(output, 'manifest.json'), 'utf8'));
      assert.equal(manifest.manifest_version, 3);
      assert.equal(readFileSync(join(output, 'src/model-host/client.js'), 'utf8'),
        readFileSync(join(root, `src/model-host/client-${browser}.js`), 'utf8'));
      assert.equal(existsSync(join(output, 'src/model-host/client-chrome.js')), false);
      assert.equal(existsSync(join(output, 'src/model-host/client-firefox.js')), false);
      assert.equal(existsSync(join(output, 'src/model-host/offscreen.js')), browser === 'chrome');
      if (browser === 'firefox') {
        assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions,
          { required: ['none'] });
        assert.ok(!readFileSync(join(output, 'src/model-host/client.js'), 'utf8').includes('offscreen'));
      }
      assert.match(manifest.content_security_policy.extension_pages, /connect-src 'self' https:\/\/huggingface\.co https:\/\/\*\.hf\.co;/);
      assert.ok(!manifest.content_security_policy.extension_pages.includes('elevenlabs'));
      assert.deepEqual(manifest.permissions, browser === 'chrome'
        ? ['storage', 'alarms', 'offscreen'] : ['storage', 'alarms']);
      const background = manifest.background.service_worker ?? manifest.background.scripts[0];
      assert.ok(existsSync(join(root, background)));
      assert.deepEqual(manifest.content_scripts, [{
        matches: ['http://*/*', 'https://*/*'],
        js: ['src/content/content.js'], css: ['src/content/haunt.css'], run_at: 'document_idle',
      }]);
      for (const resource of manifest.web_accessible_resources[0].resources) {
        assert.ok(existsSync(join(root, resource.replace('*.svg', 'butu-calm.svg'))), `missing content module: ${resource}`);
      }
      for (const tree of ['src', 'vendor', 'assets']) {
        assert.equal(readFileSync(join(output, tree, 'fixture.txt'), 'utf8'), tree);
      }
      writeFileSync(join(output, 'stale.txt'), 'old build');
    }
    execFileSync('sh', [join(fixture, 'build.sh')]);
    for (const browser of ['chrome', 'firefox']) {
      assert.equal(existsSync(join(fixture, 'dist', browser, 'stale.txt')), false);
    }
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
