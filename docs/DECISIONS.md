# Decisions

Settled. Do not reopen without asking the user first.

1. **Browser extension, not a desktop app.**
   Page corruption needs DOM access. A desktop app could only draw overlays and
   would mostly see window titles, not page content. A desktop "ghost watching
   your windows" entry (bhoot.sh) already exists in this challenge.

2. **Both Chrome and Firefox.**
   The developer uses Firefox daily; covering both closes the main escape route.
   One src/, two manifests, browser-specific code only in src/model-host/.

3. **No Ollama, no local server, no cloud AI for detection or text generation.**
   Zero-setup install and "your browsing never leaves your machine" are the core
   pitch. Bigger models are not worth an install step.
   Exception: ElevenLabs audio (decision 12).

4. **Embeddings for on-task detection, not an LLM.**
   Faster, lighter, deterministic, and no malformed JSON.
   Default: paraphrase-MiniLM-L3-v2, q8, after the Phase 0 model comparison.
   It passed all three short relevance fixtures in both browsers. Set the real
   page threshold using this model in task 2.4; L6 scores are not interchangeable.

5. **No runtime generative text model (user-approved low-memory revision).**
   Authored templates personalized with task/heading provide the haunting text,
   stage-4 lines and diary captions. MiniLM-L3 remains required for semantic
   detection: an open-weight model still powers the central product behavior.
   SmolLM2 and FLAN-T5 experiments showed excessive memory or weak task-preserving
   copy; historical evidence remains in experiments/phase0/MODELS.md.
   Normal entry points load only the embedding worker. Its token count, input
   sizes, queue and score cache are bounded; idle/session end terminates it.
   The browser owns process allocation, so a universal whole-browser 500 MB cap
   is not an enforceable extension setting. Measure the supported-browser budget.

6. **Authored templates provide all character copy.**
   Interpolate bounded task/heading values locally as plain text. Missing values
   have safe defaults; render with textContent. Butu must never show junk.

7. **Grace period before any haunting.**
   A quick glance at an off-task page is never punished.

8. **All DOM changes reversible; inputs and forms never touched.**
   The tool must never cost the user data or break a page.

9. **Ultramarine is build-time only and optional.**
   If used, it drafts templates and fine-tuning data. It never receives user data.

10. **Tinker not used.**
    It doesn't support models this small; the deployed model is what matters.

11. **Plain JS, no framework, no bundler.**
    Smaller surface, faster iteration, fewer extension CSP problems.

12. **ElevenLabs is the primary prize target and a core feature.**
    Butu's voice (Voice Design), music box lullaby (Music), sound effects,
    a bundled base whisper pack, and opt-in personalised lines. Only the user's
    own task text is ever sent, once per session; page content and browsing
    history never are. Everything degrades gracefully to bundled audio without a key.

13. **Personalised voice lines come from templates, not the local model.**
    Spoken lines must always sound right, and each TTS call costs credits.
    Templates filled with the task text guarantee quality and keep requests small
    and predictable.

14. **Audio plays from the model host, never from content scripts.**
    Web pages often block autoplay; the Firefox background page and Chrome
    offscreen document avoid that.

15. **Other partner categories are optional extras.**
    .tech landing page, Ultramarine, Entire/Copilot, fine-tuning and stickers only
    happen after the core product and ElevenLabs work are done.

16. **Innocent aesthetic, not gothic.**
    Pastel crayon doodles, handwriting and a friendly hand-drawn teddy bear named Butu. The horror
    comes from innocence slowly corrupted, which is more unsettling than starting
    dark and sets Butu apart from other entries. No gore, no jump scares,
    no screaming. Butu is lonely, not evil.

17. **Butu's voice is an overly gentle adult voice by default.**
    Soft, sing-song, too sweet, like a nursery-rhyme narrator. Anything childlike
    only if ElevenLabs' terms clearly allow it.

18. **All assets bundled locally.**
    Fonts, doodles and audio ship inside the extension. Loading from CDNs or
    Google Fonts would be a network request and break the privacy promise.

19. **Diary as a local extension page, popup stays minimal.**
    Detailed history and settings live in diary.html, opened in a tab like
    uBlock Origin's dashboard. It loads entirely from the extension, needs no
    server, and is never haunted. The popup only starts, stops and summarises.

20. **Doodles are static SVGs, not generated images.**
    Predictable, tiny, reversible, and no image model needed at runtime.
