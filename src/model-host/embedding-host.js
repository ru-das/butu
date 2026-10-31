import { downloadProgress } from '../lib/download-progress.js';
import { EMBEDDING_LIMITS } from '../config.js';
import { validateEmbeddingRequest, validateEmbeddingScores } from '../lib/embedding-protocol.js';

// No Transformers.js import here: the document stays light, including for audio.
export class EmbeddingHost {
    constructor({ workerFactory = () => new Worker(new URL('./embedding-worker.js', import.meta.url), { type: 'module' }), limits = EMBEDDING_LIMITS } = {}) {
        this.workerFactory = workerFactory;
        this.limits = limits;
        this.worker = null;
        this.active = null;
        this.queue = [];
        this.cache = new Map();
        this.nextId = 0;
        this.idleTimer = null;
        this.requestTimer = null;
    }

    compare(task, pages, onProgress = () => {}) {
        let input;
        try {
            input = validateEmbeddingRequest(task, pages, this.limits);
        } catch (error) {
            return Promise.reject(error);
        }
        const key = JSON.stringify([input.task, input.pages]);
        const cached = this.cached(key);
        if (cached) return Promise.resolve(cached);
        if (this.queue.length + (this.active ? 1 : 0) >= this.limits.pending) {
            return Promise.reject(new Error('Embedding queue is full'));
        }
        return new Promise((resolve, reject) => {
            this.queue.push({ ...input, key, id: ++this.nextId, resolve, reject, onProgress });
            this.pump();
        });
    }

    cached(key) {
        const scores = this.cache.get(key);
        if (!scores) return null;
        this.cache.delete(key);
        this.cache.set(key, scores);
        return { scores: scores.slice(), cached: true, loadMs: 0, inferenceMs: 0 };
    }

    pump() {
        if (this.active) return;
        clearTimeout(this.idleTimer);
        while (this.queue.length) {
            const job = this.queue.shift();
            const cached = this.cached(job.key);
            if (cached) {
                job.resolve(cached);
                continue;
            }
            this.active = job;
            try {
                if (!this.worker) {
                    job.onProgress({ state: 'loading', percent: null });
                    const worker = this.workerFactory();
                    this.worker = worker;
                    worker.onmessage = ({ data }) => this.receive(worker, data);
                    worker.onerror = () => { if (worker === this.worker) this.fail(new Error('Embedding worker failed')); };
                    worker.onmessageerror = () => { if (worker === this.worker) this.fail(new Error('Embedding message failed')); };
                }
                this.requestTimer = setTimeout(() => {
                    if (this.active === job) this.fail(new Error('Embedding request timed out'));
                }, this.limits.timeoutMs);
                this.worker.postMessage({ id: job.id, task: job.task, pages: job.pages });
            } catch (error) {
                this.fail(error);
            }
            return;
        }
        if (this.worker) this.idleTimer = setTimeout(() => {
            if (!this.active && !this.queue.length) this.stopWorker();
        }, this.limits.idleMs);
    }

    receive(worker, data) {
        if (worker !== this.worker || !this.active || data?.id !== this.active.id) return;
        if (data.progress) {
            const progress = downloadProgress(data.progress);
            const key = JSON.stringify(progress);
            if (progress && key !== this.active.progressKey) {
                this.active.progressKey = key;
                this.active.onProgress(progress);
            }
            return;
        }
        try {
            if (data.error) throw new Error(String(data.error).slice(0, 1000));
            const scores = validateEmbeddingScores(data.scores, this.active.pages.length);
            if (![data.loadMs, data.inferenceMs].every(value => Number.isFinite(value) && value >= 0)) {
                throw new TypeError('Invalid embedding timing');
            }
            clearTimeout(this.requestTimer);
            const job = this.active;
            this.active = null;
            this.cache.set(job.key, scores.slice());
            while (this.cache.size > this.limits.cacheEntries) this.cache.delete(this.cache.keys().next().value);
            job.resolve({ scores, cached: false, loadMs: data.loadMs, inferenceMs: data.inferenceMs });
            this.pump();
        } catch (error) {
            this.fail(error);
        }
    }

    stopWorker() {
        clearTimeout(this.idleTimer);
        clearTimeout(this.requestTimer);
        this.worker?.terminate();
        this.worker = null;
    }

    fail(error) {
        this.stopWorker();
        const jobs = this.active ? [this.active, ...this.queue] : this.queue;
        this.active = null;
        this.queue = [];
        for (const job of jobs) {
            job.onProgress({ state: 'error', percent: null });
            job.reject(error);
        }
    }

    // Session end: cancel pending work, discard model memory, and clear scores.
    release() {
        this.fail(new Error('Embedding session ended'));
        this.cache.clear();
    }
}
