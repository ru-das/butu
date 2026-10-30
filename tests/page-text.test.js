import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePageText } from '../src/lib/page-text.js';

test('page text collapses whitespace, including nonbreaking spaces', () => {
    assert.equal(normalizePageText(' \n Study\t database\u00a0 systems  '), 'Study database systems');
    assert.equal(normalizePageText(' \n\t'), '');
    assert.equal(normalizePageText('<b>plain text</b>'), '<b>plain text</b>');
});
