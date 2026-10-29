import { TEMPLATE_LIMITS } from '../config.js';

// Returns plain text. Callers must render it with textContent, never innerHTML.
export function formatTemplate(template, { task, heading } = {}) {
    if (typeof template !== 'string' || template.length > TEMPLATE_LIMITS.templateChars || !template.trim()) {
        throw new TypeError('Invalid template');
    }
    if ((template.match(/\{[^{}]*\}/g) ?? []).some(token => token !== '{task}' && token !== '{heading}')) {
        throw new TypeError('Unknown template placeholder');
    }
    const clean = (value, fallback, max) => typeof value === 'string'
        ? value.slice(0, max).replace(/\s+/gu, ' ').trim().replace(/[\uD800-\uDBFF]$/u, '') || fallback : fallback;
    const values = {
        task: clean(task, 'our little task', TEMPLATE_LIMITS.taskChars),
        heading: clean(heading, 'This page', TEMPLATE_LIMITS.headingChars),
    };
    return template.replace(/\{(task|heading)\}/g, (_, key) => values[key]);
}
