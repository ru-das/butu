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

test('authored packs meet task 3.6 counts and use supported plain-text placeholders', async () => {
    const { formatTemplate } = await import('../src/lib/templates.js');
    const packs = await import('../src/templates.js');
    const minimums = { TAUNTS: 20, STAGE4_LINES: 10, VOICE_LINE_TEMPLATES: 10, DIARY_CAPTIONS: 10, POPUP_SUMMARY_LINES: 5 };
    for (const [name, minimum] of Object.entries(minimums)) {
        const lines = packs[name];
        assert.ok(lines.length >= minimum, name);
        assert.equal(new Set(lines).size, lines.length, `${name}: no duplicate lines`);
        for (const line of lines) {
            assert.ok(formatTemplate(line).trim(), `${name}: safe defaults`);
            const formatted = formatTemplate(line, { task: 'DBMS assignment', heading: 'Cricket' });
            assert.ok(!/\{[^{}]*\}/u.test(formatted), `${name}: all placeholders filled`);
            if (line.includes('{task}')) assert.match(formatted, /DBMS assignment/);
            if (line.includes('{heading}')) assert.match(formatted, /Cricket/);
        }
    }
    assert.ok(packs.STAGE4_LINES.every(line => line.includes('{task}')));
    assert.ok(packs.VOICE_LINE_TEMPLATES.every(line => line.includes('{task}')));
    assert.ok(packs.VOICE_LINE_TEMPLATES.every(line => !line.includes('{heading}')));
});
