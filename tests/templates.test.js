const { test } = require('node:test');
const assert = require('node:assert/strict');

test('task and heading interpolation is bounded plain text, with safe fallbacks', async () => {
    const { formatTemplate } = await import('../src/lib/templates.js');
    const { TEMPLATE_LIMITS } = await import('../src/config.js');
    assert.equal(formatTemplate('{task}: {heading}', { task: '  DBMS\n homework ', heading: ' cricket ' }), 'DBMS homework: cricket');
    assert.equal(formatTemplate('{task}: {heading}'), 'our little task: This page');
    assert.equal(formatTemplate('{task}', { task: '$& <b>{heading}</b>' }), '$& <b>{heading}</b>', 'user placeholders are literal, not recursive');
    assert.equal(formatTemplate('{task}', { task: 'x'.repeat(10000) }).length, TEMPLATE_LIMITS.taskChars);
    assert.equal(formatTemplate('{heading}', { heading: 'x'.repeat(10000) }).length, TEMPLATE_LIMITS.headingChars);
    assert.equal(formatTemplate('{task}', { task: 'x'.repeat(199) + '🐻' }), 'x'.repeat(199));
    assert.throws(() => formatTemplate('{unknown}'), /Unknown/);
    assert.throws(() => formatTemplate(null), /Invalid/);
    assert.throws(() => formatTemplate('x'.repeat(401)), /Invalid/);
});

test('all authored copy personalizes; voice templates contain only task text', async () => {
    const { formatTemplate } = await import('../src/lib/templates.js');
    const packs = await import('../src/templates.js');
    for (const lines of Object.values(packs)) {
        for (const line of lines) assert.match(formatTemplate(line, { task: 'DBMS assignment', heading: 'Cricket' }), /DBMS assignment/);
    }
    assert.ok(packs.VOICE_LINE_TEMPLATES.every(line => !line.includes('{heading}')));
});
