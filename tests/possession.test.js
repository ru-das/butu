import assert from 'node:assert/strict';
import test from 'node:test';
import { possessionTemplates, diaryCaption, popupSummaryLine } from '../src/lib/possession.js';
import { formatTemplate } from '../src/lib/templates.js';
import { TAUNTS, STAGE4_LINES, DIARY_CAPTIONS, POPUP_SUMMARY_LINES } from '../src/templates.js';

test('page choices are stable across revisits, independent of visiting order', () => {
    const session = { task: 'Study databases', startedAt: 1000, endsAt: 601000 };
    const urls = Array.from({ length: 10 }, (_, index) => `https://example.org/page/${index}`);
    const choices = urls.map(url => possessionTemplates(session, url));
    for (const url of urls.toReversed()) {
        const choice = possessionTemplates({ ...session }, url);
        assert.deepEqual(choice, choices[urls.indexOf(url)]);
        assert.ok(TAUNTS.includes(choice.taunt));
        assert.ok(STAGE4_LINES.includes(choice.stage4));
    }
    assert.ok(new Set(choices.map(choice => choice.taunt)).size > 1);
    assert.notDeepEqual(urls.map(url => possessionTemplates({ ...session, startedAt: 2000 }, url)), choices);
});

test('possession and diary use bounded literal values and safe missing-value defaults', () => {
    const session = { task: '<img src=x onerror=alert(1)>{heading}$&' };
    const choice = possessionTemplates(session, 'https://example.org');
    assert.ok(formatTemplate(choice.stage4, session).includes(session.task));
    assert.ok(DIARY_CAPTIONS.some(line => formatTemplate(line, session) === diaryCaption(session)));
    assert.equal(diaryCaption({ ...session }), diaryCaption(session));
    assert.ok(POPUP_SUMMARY_LINES.includes(popupSummaryLine(session)));
    assert.equal(popupSummaryLine({ ...session }), popupSummaryLine(session));
    assert.ok(!diaryCaption(null).includes('undefined'));
    assert.ok(formatTemplate(possessionTemplates(null, '').stage4).includes('our little task'));
    for (const line of [choice.taunt, choice.stage4, ...DIARY_CAPTIONS]) {
        const rendered = formatTemplate(line, { task: 'T'.repeat(10000), heading: 'H'.repeat(10000) });
        assert.ok(!rendered.includes('T'.repeat(201)));
        assert.ok(!rendered.includes('H'.repeat(161)));
    }
});
