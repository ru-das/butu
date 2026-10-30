import { PAGE_MAIN_TEXT_CHARS } from '../config.js';
import { normalizePageText } from '../lib/page-text.js';

const EXCLUDED = 'nav, footer, [role="navigation"], [role="contentinfo"], ' +
    'script, style, noscript, template, input, textarea, select, ' +
    '[contenteditable]:not([contenteditable="false"]), [hidden], [aria-hidden="true"], ' +
    'details:not([open]) > :not(summary)';

function excluded(element, view) {
    const style = view.getComputedStyle(element);
    return element.matches(EXCLUDED) || style.display === 'none' ||
        style.contentVisibility === 'hidden' || Number(style.opacity) === 0;
}

function sample(root, doc) {
    const view = doc.defaultView;
    for (let element = root; element; element = element.parentElement) {
        if (excluded(element, view)) return '';
    }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                if (excluded(node, view)) return NodeFilter.FILTER_REJECT;
                return node.tagName === 'BR' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
            }
            const style = view.getComputedStyle(node.parentElement);
            // Do not prune visibility:hidden ancestors: descendants can override it.
            if (style.visibility !== 'visible' || !node.textContent ||
                node.parentElement.matches('details:not([open])')) {
                return NodeFilter.FILTER_REJECT;
            }
            const range = doc.createRange();
            range.selectNodeContents(node);
            return [...range.getClientRects()].some((rect) => rect.width > 0 && rect.height > 0)
                ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
    });
    let text = '';
    let previousBlock;
    let node;
    while ((node = walker.nextNode())) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            text += ' ';
            continue;
        }
        let block = node.parentElement;
        while (block.parentElement && /^(inline|contents)/u.test(view.getComputedStyle(block).display)) {
            block = block.parentElement;
        }
        // Preserve inline words/punctuation, but separate adjacent paragraphs.
        text += `${block !== previousBlock ? ' ' : ''}${node.textContent}`;
        previousBlock = block;
        if (normalizePageText(text).length >= PAGE_MAIN_TEXT_CHARS) break;
    }
    return normalizePageText(text).slice(0, PAGE_MAIN_TEXT_CHARS);
}

export function extractPageText(doc = document) {
    let mainText = '';
    // ponytail: semantic landmarks, then body; no site-specific readability scoring.
    for (const selector of ['main, [role="main"]', 'article', 'body']) {
        for (const root of doc.querySelectorAll(selector)) {
            mainText = sample(root, doc);
            if (mainText) break;
        }
        if (mainText) break;
    }
    return {
        title: normalizePageText(doc.title),
        description: normalizePageText(doc.querySelector('meta[name="description" i]')?.content ?? ''),
        mainText,
    };
}
