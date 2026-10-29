// Test-copy worker instrumentation only; never imported by normal entry points.
const audit = { fetches: [], hits: [], misses: [] };
const remote = value => /^https?:/.test(String(value?.url ?? value));
const originalFetch = globalThis.fetch;
globalThis.fetch = function (input, ...args) {
    if (remote(input)) audit.fetches.push(String(input?.url ?? input));
    return originalFetch.call(this, input, ...args);
};
const originalMatch = Cache.prototype.match;
Cache.prototype.match = async function (input, ...args) {
    const response = await originalMatch.call(this, input, ...args);
    if (remote(input)) audit[response ? 'hits' : 'misses'].push(String(input?.url ?? input));
    return response;
};
const originalPost = self.postMessage;
self.postMessage = function (data, ...args) {
    return originalPost.call(this, { ...data, cacheAudit: audit }, ...args);
};
