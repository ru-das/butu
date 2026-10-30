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

12. **ElevenLabs is the primary prize target and a core feature (free-tier revision, 2026-10-30).**
    Standard TTS with an account-verified premade adult voice, sound effects
    within free quota, a bundled base whisper pack, and opt-in personalised
    lines. The music box is composed and rendered locally. Voice Design, cloning,
    paid Voice Library voices and Music API are removed at the user's request.
    Only the user's
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

17. **Butu is a sweet, fictional childlike companion (later user correction).**
    The earlier adult-narrator default was superseded by the user's direction
    and approval of manual website Voice Design. Use the supplied original
    character recordings as the intended bundled voice. Their exact source voice
    ID/model is pending, not inferred from the audio. Sarah remains only the
    separately verified premade API candidate; do not claim it is the supplied
    custom voice or silently mix both voices in a session.

18. **All assets bundled locally.**
    Fonts, doodles and audio ship inside the extension. Loading from CDNs or
    Google Fonts would be a network request and break the privacy promise.

19. **Diary as a local extension page, popup stays minimal.**
    Detailed history and settings live in diary.html, opened in a tab like
    uBlock Origin's dashboard. It loads entirely from the extension, needs no
    server, and is never haunted. The popup only starts, stops and summarises.

20. **Doodles are static SVGs, not generated images.**
    Predictable, tiny, reversible, and no image model needed at runtime.

21. **Free-tier compatibility, approved by the user on 2026-10-30.**
    Keep the free account, no SDK dependency or paid-service requirement. Live
    standard TTS succeeded for Sarah, Matilda and Lily: 435 total characters/credits.
    Sarah is the configured adult narrator based on metadata; listening review
    remains a manual check. Premade Default voices are account-dependent and
    retire after 2026-12-31; bundles must keep the app usable without API access.
    Never switch automatically to a paid replacement voice. Model, format,
    voice IDs, expiry and character budgets live in src/config.js. Reserve quota
    before sending, including uncertain failures. Runtime V6 must enforce the
    shared budget helper and persist a rolling 31-day reservation ledger; no
    retries, overages or top-ups. Account/subscription discovery is build-time
    only, preserving the session-start-TTS-only runtime network boundary.
    Free-plan output is noncommercial with attribution; code and generated audio
    have separate licensing. Sources and remaining tasks: docs/voice-design.md.

22. **Manual speech-pack handoff, following the user's website workflow.**
    Fifteen clips received in assets/audio/voice/, plus intended scripts/tags,
    file hashes, format checks and credits. Original MP3s stay unchanged.
    Voice ID/model/plan/actual usage and subjective transcript checks remain
    unconfirmed; the manifest records those gaps explicitly. V2/V3 remain next
    in order; V4 finalizes the pack and V5 wires playback. No new API requests
    or runtime behavior are part of asset intake. Manual creation is distinct
    from the paid Voice Design API restriction in decision 12.
