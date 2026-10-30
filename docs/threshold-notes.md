# Threshold tuning — task 2.4

Measured 2026-10-30, for the exact task **DBMS assignment on normalization**.

## Recommendation

Set `ON_TASK_THRESHOLD = 0.13` in `src/config.js`. Compare with `score >= threshold`.
This is a provisional, recall-first calibration: 10/10 relevant pages are on task,
6/10 unrelated pages are off task, with 4 false positives and no false negatives
(16/20 correct, 80% calibration accuracy; on-task precision 10/14 = 71.4%).
A false positive here means unrelated content is permitted; a false negative means
legitimate work would eventually be haunted. Prefer avoiding the latter.

There is **no separating threshold** for this sample: statistical normalization
(0.48116163010672075) scores above 8 of the 10 relevant pages, and functional
dependency scores only 0.14189074481634165. Raising the cutoff cannot fix the
unrelated normalization pages without rejecting legitimate DBMS work. Do not
interpret these cosine similarities as probabilities.

`0.13` leaves about 0.01189 below the weakest positive, while rejecting all sampled
entertainment pages and the JavaScript guide. It ties the best accuracy obtainable
by any single cutoff on these 20 scores, while retaining every relevant page.
This is a product tradeoff, not evidence that detection is solved. The false
positives are statistical normalization, audio normalization, normal distribution
and the Python tutorial. Existing domain overrides remain available, but none
were used in this experiment; a domain-wide Wikipedia/YouTube allowlist would
hide the very errors being measured.

## Method and scope

- Chrome 153.0.8010.12, isolated headless profile, actual built Chrome extension.
  Visited each URL below as a real network-loaded page, with a live session and
  empty allowlist/blocklist. No authored replacement page text or search snippets
  were fed to the detector. Labels reflect whether the page helps the named
  assignment: functional dependencies and lossless decomposition are supporting
  DBMS concepts; unrelated programming tutorials and statistical/audio meanings
  of normalization are off task. Labels were selected before scores were read.
- Scores came from the extension's `verdictCache` entries written by the real
  background verdict path, which also logs `[Butu verdict]`. Calibration initially
  ran with threshold unset; that affects only the boolean verdict, not the score.
  Console events retained during the revisit are included below as additional
  evidence, including transient `unavailable` events and a repeated music video.
- Production `extractPageText` reads title, description and first 500 visible main
  characters. `pageEmbeddingText` collapses whitespace, joins the three with spaces
  and bounds the combined string to 1024 characters. The URL is used for caching,
  not embedded. The appendix retains all exact extraction fields and full scores.
- Model: `Xenova/paraphrase-MiniLM-L3-v2`, revision
  `f2d931077e6527467d9ffc873f647d835e589e82`, q8, WASM CPU, one thread,
  mean pooling, normalized embeddings, cosine similarity; tokenizer cap 128 tokens.
  One lazy dedicated worker; no L6 model, generative model, remote inference,
  new dependency, host permission or runtime network endpoint.
- Firefox 154.0.1: actual built Firefox extension in a separate isolated profile.
  Replayed **the exact 20 Chrome-extracted inputs** through its production
  `comparePage`, `pageEmbeddingText` and `scoreVerdict` functions with threshold
  0.13. All 20 scores match Chrome exactly (maximum absolute difference 0).
  This checks model/threshold parity; it is not a claim of 20 live Firefox visits
  or a live Firefox YouTube/SPA extraction check. Exact live manual steps follow.
- Page requests were normal browser navigation. Inputs, URLs and scores were kept
  locally. Only the model's Hugging Face download was needed by the detector;
  no ElevenLabs calls were made (0 characters used). Repeated visits used fresh
  sessions so previous session URL caches did not replace new measurements.

## Checklist: 10 on-task pages

Checked boxes mean **visited and scored**, not that every classification is right.
The listed score is the full-precision Chrome calibration score; Firefox replay
returned the identical value. The boolean is calculated at the selected cutoff.

- [x] 1. [Database normalization - Wikipedia](https://en.wikipedia.org/wiki/Database_normalization) — `0.5447627550773319` → on task.
- [x] 2. [First normal form - Wikipedia](https://en.wikipedia.org/wiki/First_normal_form) — `0.35336947336017177` → on task.
- [x] 3. [Second normal form - Wikipedia](https://en.wikipedia.org/wiki/Second_normal_form) — `0.3813338249621253` → on task.
- [x] 4. [Third normal form - Wikipedia](https://en.wikipedia.org/wiki/Third_normal_form) — `0.4091168571184909` → on task.
- [x] 5. [Boyce–Codd normal form - Wikipedia](https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form) — `0.321766205096914` → on task.
- [x] 6. [Functional dependency - Wikipedia](https://en.wikipedia.org/wiki/Functional_dependency) — `0.14189074481634165` → on task.
- [x] 7. [Lossless join decomposition - Wikipedia](https://en.wikipedia.org/wiki/Lossless_join_decomposition) — `0.2793880376540707` → on task.
- [x] 8. [Fourth normal form - Wikipedia](https://en.wikipedia.org/wiki/Fourth_normal_form) — `0.4008062650657455` → on task.
- [x] 9. [Database normalization description | Microsoft Learn](https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description) — `0.5635695905351953` → on task.
- [x] 10. [Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF - YouTube](https://www.youtube.com/watch?v=GFQaEYEc8_8) — `0.4105025139547648` → on task.

## Checklist: 10 off-task pages

- [x] 1. [Normalization (statistics) - Wikipedia](https://en.wikipedia.org/wiki/Normalization_(statistics)) — `0.48116163010672075` → on task. **False positive.**
- [x] 2. [Audio normalization - Wikipedia](https://en.wikipedia.org/wiki/Audio_normalization) — `0.39776920430886986` → on task. **False positive.**
- [x] 3. [Normal distribution - Wikipedia](https://en.wikipedia.org/wiki/Normal_distribution) — `0.3206405932816217` → on task. **False positive.**
- [x] 4. [The Python Tutorial — Python 3.15.2 documentation](https://docs.python.org/3/tutorial/) — `0.1599804989576573` → on task. **False positive.**
- [x] 5. [Association football - Wikipedia](https://en.wikipedia.org/wiki/Association_football) — `0.07119009978269461` → off task.
- [x] 6. [Chess - Wikipedia](https://en.wikipedia.org/wiki/Chess) — `0.007837202110410231` → off task.
- [x] 7. [Pizza - Wikipedia](https://en.wikipedia.org/wiki/Pizza) — `-0.13924916408321508` → off task.
- [x] 8. [Minecraft - Wikipedia](https://en.wikipedia.org/wiki/Minecraft) — `-0.11661656481470974` → off task.
- [x] 9. [Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) - YouTube](https://www.youtube.com/watch?v=dQw4w9WgXcQ) — `-0.1582909512882195` → off task.
- [x] 10. [JavaScript Guide - JavaScript | MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — `0.05145592301364417` → off task.

## Candidate cutoffs

Positive means on task. These are calibration results on the same labeled set,
not held-out accuracy estimates.

| Threshold | True on task | False off task (haunts work) | False on task (permits drift) | True off task | Correct / 20 |
|---|---:|---:|---:|---:|---:|
| 0.10 | 10 | 0 | 4 | 6 | 16 |
| 0.13 | 10 | 0 | 4 | 6 | 16 |
| 0.14 | 10 | 0 | 4 | 6 | 16 |
| 0.15 | 9 | 1 | 4 | 6 | 15 |
| 0.17 | 9 | 1 | 3 | 7 | 16 |
| 0.20 | 9 | 1 | 3 | 7 | 16 |
| 0.27 | 9 | 1 | 3 | 7 | 16 |
| 0.30 | 8 | 2 | 3 | 7 | 15 |
| 0.33 | 7 | 3 | 2 | 8 | 15 |
| 0.35 | 7 | 3 | 2 | 8 | 15 |
| 0.40 | 5 | 5 | 1 | 9 | 14 |
| 0.49 | 2 | 8 | 0 | 10 | 12 |

## Visit issues and limitations

The initial MDN Flexbox URL returned a real 404 page. Its 0.11338239594875982
score is excluded from the 20-page calibration; the real JavaScript Guide replaces
it. The rejected visit is retained in the attempt log below.

Microsoft redirects from the checklist URL to the `previous-versions` URL in its
extraction record. The first harness waited for the old URL and timed out; the
revisit followed the final URL and recorded a real score. The relevant YouTube
page initially kept loading despite having its title/content visible. On revisit,
the harness stopped remaining resource loading after 15 seconds, allowing document
idle extraction; it did not edit the page or synthesize metadata. The player showed
an error on the first attempt, so this establishes semantic page relevance, not
successful video playback. The unrelated video was measured with a sponsored
player visible, which is retained in the main-text field.

Wikipedia notices consume much of the first 500 characters of the functional
dependency and first/second-normal-form pages. This is an extractor/model limit;
the sample was not cleaned to make scores look better. Ads, descriptions, consent,
login state, localization and SPA timing can change subsequent scores. A repeated
music-video log scored -0.16223989340651934 instead of the calibration
-0.1582909512882195; both are off task. Frozen-input parity removes these page
changes from the browser/model comparison.

This small, handpicked, single-task set includes 15 Wikipedia pages and no held-out
split. It cannot establish reliability across tasks, languages, sites or future
page versions. Recalibrate on a broader independently labeled set before claiming
general accuracy. Do not silently change the model or extraction strategy to make
these examples separate. Fresh live Firefox extraction remains a manual check.

## Live Chrome YouTube recheck after setting 0.13

A fresh isolated Chrome session with the rebuilt extension visited both videos
again. The relevant video scored **0.4105025139547648** (on task); the music video
scored **-0.16126617007970426** (off task). Its changed ads/text account for the
small difference from the first calibration score. These two revisits are
verification, not extra calibration examples. They exercise real page extraction,
background routing, offscreen inference and URL-cache writes with the configured
threshold. This harness did not retain console events for the final recheck;
its scores were retrieved from the production verdict cache.

## Automated validation

`node --test tests/*.test.js`: 23/23 passed after updating the old untuned-default
expectations and checking the configured inclusive cutoff. The sandbox initially
rejected the build test's shell subprocess (`spawnSync sh EPERM`); the complete
suite passed when run with that subprocess permitted. `./build.sh` produced both
browser packages. Firefox's production model replay matched all 20 scores exactly.

## Exact manual steps — Chrome

1. Run `./build.sh`. Open `chrome://extensions`, enable Developer mode, load
   unpacked `dist/chrome` (or reload Butu), then Inspect its service worker.
2. In the extension console run
   `await chrome.storage.local.remove(['allowlist', 'blocklist'])`. Stop any
   existing session. Start a 60-minute session in the popup with the exact task
   `DBMS assignment on normalization`. Do not change capitalization or add words.
3. Visit each of the 20 checklist URLs in the same session, waiting for its
   `[Butu verdict]` event. Record the final URL, full `score`, `onTask`, `source`
   and `cached`. Expect `source: 'embedding'`; unavailable results are not failures
   of relevance and must be retried after load. Follow the Microsoft redirect.
4. Visit the Decomplexify video and the Rick Astley video directly (separate tabs,
   rather than only YouTube's in-page navigation). Expect respectively true and
   false. If loading never settles, press Escape after the visible title and
   description arrive, then reactivate the tab; do not substitute a search result
   or consent screen for the video page.
5. Inspect local scores with
   `await chrome.storage.local.get('verdictCache')`. Revisiting a URL should log
   the same score with `cached: true`. Start a fresh session to measure changed
   page content at that URL. The four documented false positives should remain
   visible as errors of the selected cutoff, not be hidden with overrides.
6. Stop the session. Verify `verdictCache` is cleared. Check extension Network
   requests: page inputs/scores must not appear in outgoing payloads. Distinguish
   the visited site's own resource requests from extension inference requests.

## Exact manual steps — Firefox

1. Run `./build.sh`. Open `about:debugging#/runtime/this-firefox`, Load Temporary
   Add-on, and select `dist/firefox/manifest.json` (or reload Butu). Grant website
   access if prompted. Click Inspect to open Butu's background console.
2. Run `await chrome.storage.local.remove(['allowlist', 'blocklist'])` there.
   Stop any old session and start a 60-minute popup session with the exact task
   `DBMS assignment on normalization`.
3. Visit all 20 checklist URLs and record the same five log fields as in Chrome
   step 3. Follow redirects, wait for the final document, and retry unavailable
   extraction. Firefox uses its background page host and dedicated worker.
4. Open both YouTube links directly in separate tabs. Expect Decomplexify true
   and Rick Astley false. If resources keep loading, press Escape once the real
   title/description are present, then switch away and back. Check actual page
   text if scores differ; the automated Firefox comparison used frozen inputs.
5. Repeat Chrome steps 5–6 for URL cache reuse, fresh-session measurement, cleanup
   and the local-inference network boundary. Do not expect identical live scores
   when ads or visible text differ; compare the retained inputs first.

## Full local measurement record

The following JSON preserves the exact task, visit timestamps, extraction fields,
full Chrome scores, all Firefox replay verdicts and retry/console evidence. Long
URLs in CDP console previews may be abbreviated by Chrome; full URLs are retained
in each page record. Calibration entries were read from local storage after the
background wrote the measured score, rather than reconstructed from rounded logs.

```json
{
  "chrome": {
    "task": "DBMS assignment on normalization",
    "started": "2026-10-30T05:59:21.161Z",
    "pages": [
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Database_normalization",
        "visitedAt": "2026-10-30T05:59:36.872Z",
        "extraction": {
          "title": "Database normalization - Wikipedia",
          "description": "",
          "mainText": "Database normalization From Wikipedia, the free encyclopedia This article needs attention from an expert in databases. See the talk page for details. WikiProject Databases may be able to help recruit an expert. (March 2018) Database normalization is the process of structuring a relational database in accordance with a series of normal forms to reduce data redundancy and improve data integrity. It was first proposed by British computer scientist Edgar F. Codd as part of his relational model. Norm",
          "url": "https://en.wikipedia.org/wiki/Database_normalization"
        },
        "score": 0.5447627550773319
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/First_normal_form",
        "visitedAt": "2026-10-30T05:59:49.550Z",
        "extraction": {
          "title": "First normal form - Wikipedia",
          "description": "",
          "mainText": "First normal form From Wikipedia, the free encyclopedia This article has an unclear citation style. The references used may be made clearer with a different or consistent style of citation and footnoting. (May 2025) (Learn how and when to remove this message) First normal form (1NF) is the most basic level of database normalization defined by English computer scientist Edgar F. Codd, the inventor of the relational database. A relation (or a table, in SQL) can be said to be in first normal form i",
          "url": "https://en.wikipedia.org/wiki/First_normal_form"
        },
        "score": 0.35336947336017177
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Second_normal_form",
        "visitedAt": "2026-10-30T05:59:51.061Z",
        "extraction": {
          "title": "Second normal form - Wikipedia",
          "description": "",
          "mainText": "Second normal form From Wikipedia, the free encyclopedia This article includes a list of general references but lacks sufficient corresponding inline citations. Please help improve this article by introducing more precise citations. (June 2024) (Learn how and when to remove this message) Second normal form (2NF) is a level of database normalization defined by English computer scientist Edgar F. Codd. A relation (or a table, in SQL) is in 2NF if it is in first normal form (1NF) and contains no pa",
          "url": "https://en.wikipedia.org/wiki/Second_normal_form"
        },
        "score": 0.3813338249621253
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Third_normal_form",
        "visitedAt": "2026-10-30T05:59:52.198Z",
        "extraction": {
          "title": "Third normal form - Wikipedia",
          "description": "",
          "mainText": "Third normal form From Wikipedia, the free encyclopedia Third normal form (3NF) is a level of database normalization defined by English computer scientist Edgar F. Codd. A relation (or table, in SQL) is in third normal form if it is in second normal form and also lacks non-key dependencies, meaning that no non-prime attribute is functionally dependent on (that is, contains a fact about) any other non-prime attribute. In other words, each non-prime attribute must depend solely and non-transitivel",
          "url": "https://en.wikipedia.org/wiki/Third_normal_form"
        },
        "score": 0.4091168571184909
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form",
        "visitedAt": "2026-10-30T05:59:53.358Z",
        "extraction": {
          "title": "Boyce–Codd normal form - Wikipedia",
          "description": "",
          "mainText": "Boyce–Codd normal form From Wikipedia, the free encyclopedia Not to be confused with Backus–Naur form. Boyce–Codd normal form (BCNF or 3.5NF) is a normal form used in database normalization. It is a slightly stricter version of the third normal form (3NF). By using BCNF, a database will remove all redundancies based on functional dependencies. Historyedit Edgar F. Codd released his original article \"A Relational Model of Data for Large Shared Databanks\" in June 1970. This was the first time the ",
          "url": "https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form"
        },
        "score": 0.321766205096914
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Functional_dependency",
        "visitedAt": "2026-10-30T05:59:54.533Z",
        "extraction": {
          "title": "Functional dependency - Wikipedia",
          "description": "",
          "mainText": "Functional dependency From Wikipedia, the free encyclopedia This article is about a concept in relational database theory. For function dependencies in the Haskell programming language, see type class. This article needs more citations. Please help improve this article by adding citations to reliable sources. Unsourced material may be challenged and removed. Find sources: \"Functional dependency\" – news · newspapers · books · scholar ·JSTOR (October 2012) (Learn how and when to remove this messag",
          "url": "https://en.wikipedia.org/wiki/Functional_dependency"
        },
        "score": 0.14189074481634165
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Lossless_join_decomposition",
        "visitedAt": "2026-10-30T05:59:57.112Z",
        "extraction": {
          "title": "Lossless join decomposition - Wikipedia",
          "description": "",
          "mainText": "Lossless join decomposition From Wikipedia, the free encyclopedia In database design, a lossless join decomposition is a decomposition of a relation into relations such that a natural join of the two smaller relations yields back the original relation. This is central in removing redundancy safely from databases while preserving the original data.[1] Lossless join can also be called non-additive.[2] Definitionedit A relation on schema decomposes losslessly onto schemas and if , that is is the na",
          "url": "https://en.wikipedia.org/wiki/Lossless_join_decomposition"
        },
        "score": 0.2793880376540707
      },
      {
        "expected": true,
        "url": "https://en.wikipedia.org/wiki/Fourth_normal_form",
        "visitedAt": "2026-10-30T06:00:01.389Z",
        "extraction": {
          "title": "Fourth normal form - Wikipedia",
          "description": "",
          "mainText": "Fourth normal form From Wikipedia, the free encyclopedia Fourth normal form (4NF) is a normal form used in database normalization. Introduced by Ronald Fagin in 1977, 4NF is the next level of normalization after Boyce–Codd normal form (BCNF). Whereas the second, third, and Boyce–Codd normal forms are concerned with functional dependencies, 4NF is concerned with a more general type of dependency known as a multivalued dependency. A table is in 4NF if and only if, for every one of its non-trivial ",
          "url": "https://en.wikipedia.org/wiki/Fourth_normal_form"
        },
        "score": 0.4008062650657455
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Normalization_(statistics)",
        "visitedAt": "2026-10-30T06:03:06.888Z",
        "extraction": {
          "title": "Normalization (statistics) - Wikipedia",
          "description": "",
          "mainText": "Normalization (statistics) From Wikipedia, the free encyclopedia For other uses, see Normalizing constant. In statistics and applications of statistics, normalization can have a range of meanings.[1] In the simplest cases, normalization of ratings means adjusting values measured on different scales to a notionally common scale, often prior to averaging. In more complicated cases, normalization may refer to more sophisticated adjustments where the intention is to bring the entire probability dist",
          "url": "https://en.wikipedia.org/wiki/Normalization_(statistics)"
        },
        "score": 0.48116163010672075
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Audio_normalization",
        "visitedAt": "2026-10-30T06:03:11.959Z",
        "extraction": {
          "title": "Audio normalization - Wikipedia",
          "description": "",
          "mainText": "Audio normalization From Wikipedia, the free encyclopedia Audio normalization is the application of a constant amount of gain to an audio recording to bring the amplitude to a target level (the norm). Because the same amount of gain is applied across the entire recording, the signal-to-noise ratio and relative dynamics are unchanged. Normalization is one of the functions commonly provided by a digital audio workstation and is used in broadcast and streaming media delivery. Two principal types of",
          "url": "https://en.wikipedia.org/wiki/Audio_normalization"
        },
        "score": 0.39776920430886986
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Normal_distribution",
        "visitedAt": "2026-10-30T06:03:14.670Z",
        "extraction": {
          "title": "Normal distribution - Wikipedia",
          "description": "",
          "mainText": "Normal distribution From Wikipedia, the free encyclopedia \"Bell curve\" redirects here. For other uses, see Bell curve (disambiguation). Normal distribution Probability density function The red curve is the standard normal distribution. Cumulative distribution function Notation Parameters = mean (location) = variance (squared scale) Support PDF CDF Quantile Mean Median Mode Variance MAD AAD Skewness Excess kurtosis Entropy MGF CF Fisher information Kullback–Leibler divergence In probability theor",
          "url": "https://en.wikipedia.org/wiki/Normal_distribution"
        },
        "score": 0.3206405932816217
      },
      {
        "expected": false,
        "url": "https://docs.python.org/3/tutorial/",
        "visitedAt": "2026-10-30T06:03:28.292Z",
        "extraction": {
          "title": "The Python Tutorial — Python 3.15.2 documentation",
          "description": "Python is an easy to learn, powerful programming language. It has efficient high-level data structures and a simple but effective approach to object-oriented programming. Python’s elegant syntax an...",
          "mainText": "The Python Tutorial Tip This tutorial is designed for programmers that are new to the Python language, not beginners who are new to programming. Python is an easy to learn, powerful programming language. It has efficient high-level data structures and a simple but effective approach to object-oriented programming. Python’s elegant syntax and dynamic typing, together with its interpreted nature, make it an ideal language for scripting and rapid application development in many areas on most platfo",
          "url": "https://docs.python.org/3/tutorial/"
        },
        "score": 0.1599804989576573
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Association_football",
        "visitedAt": "2026-10-30T06:03:29.744Z",
        "extraction": {
          "title": "Association football - Wikipedia",
          "description": "",
          "mainText": "Association football From Wikipedia, the free encyclopedia \"Soccer\" redirects here. For other uses, see Soccer (disambiguation). Association football The attacking player (No. 10) attempts to score a goal by kicking the ball into the net behind the opposing team's goalkeeper. Highest governing body FIFA Nicknames The beautiful game The World's Game[1][2] First played December 1863, England[3] Characteristics Contact Yes Team members 11 per side: Goalkeeper Defenders Midfielders Forwards Mixed-se",
          "url": "https://en.wikipedia.org/wiki/Association_football"
        },
        "score": 0.07119009978269461
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Chess",
        "visitedAt": "2026-10-30T06:03:31.925Z",
        "extraction": {
          "title": "Chess - Wikipedia",
          "description": "",
          "mainText": "Chess From Wikipedia, the free encyclopedia This article is about Western chess. For other chess games or other uses, see Chess (disambiguation). Chess Part of a Staunton chess setLeft to right: white king, black rook, black queen, white pawn, black knight, white bishop Years active c. 1475 to present[1] (predecessors c. 900 years earlier) Genres Board game Abstract strategy game Mind sport Players 2 Chance None Skills Strategy, tactics Chess is a board game for two players, played on a square b",
          "url": "https://en.wikipedia.org/wiki/Chess"
        },
        "score": 0.007837202110410231
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Pizza",
        "visitedAt": "2026-10-30T06:03:35.865Z",
        "extraction": {
          "title": "Pizza - Wikipedia",
          "description": "",
          "mainText": "Pizza From Wikipedia, the free encyclopedia For other uses, see Pizza (disambiguation). Pizza A veggie pizza divided into eight slices Type Flatbread Course One course meal Place of origin Italy Region or state Naples, Campania Serving temperature Hot or warm Main ingredients Dough, sauce (usually tomato sauce), cheese (typically mozzarella) Similar dishes Calzone, panzerotti Media: Pizza Pizza[a] is an Italian dish typically consisting of a flat base of leavened wheat-based dough topped with to",
          "url": "https://en.wikipedia.org/wiki/Pizza"
        },
        "score": -0.13924916408321508
      },
      {
        "expected": false,
        "url": "https://en.wikipedia.org/wiki/Minecraft",
        "visitedAt": "2026-10-30T06:03:37.037Z",
        "extraction": {
          "title": "Minecraft - Wikipedia",
          "description": "",
          "mainText": "Minecraft From Wikipedia, the free encyclopedia This article is about the video game. For the franchise, see Minecraft (franchise). For other uses, see Minecraft (disambiguation). Minecraft Logo used since 2021 Developer Mojang Studios[a] Publisher Mojang Studios[b] Designers Markus Persson[c] Jens Bergensten Artists Markus Toivonen Jasper Boerstra Kristoffer Zetterstrand Composer C418[d] Series Minecraft Engine LWJGL (Java Edition) Platforms show List Release show 18 November 2011 Genres Sandbo",
          "url": "https://en.wikipedia.org/wiki/Minecraft"
        },
        "score": -0.11661656481470974
      },
      {
        "expected": false,
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "visitedAt": "2026-10-30T06:03:40.792Z",
        "extraction": {
          "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) - YouTube",
          "description": "The official video for “Never Gonna Give You Up” by Rick Astley. Never: The Autobiography 📚 OUT NOW! Follow this link to get your copy and listen to Rick’s ...",
          "mainText": "Magic on tap. apple.com Learn more Sponsored 1 of 2 apple.com 0:00 / 0:06",
          "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        },
        "score": -0.1582909512882195
      },
      {
        "expected": true,
        "url": "https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description",
        "visitedAt": "2026-10-30T06:05:26.761Z",
        "finalUrl": "https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description",
        "extraction": {
          "title": "Database normalization description | Microsoft Learn",
          "description": "Describe the method to normalize the database and gives several alternatives to normalize forms. You need to master the database principles to understand them or you can follow the steps listed in the article.",
          "mainText": "Ask Learn Description of the database normalization basics Applies to: Access 2021, Access 2019, Access 2016, Access 2013 Summarize this article for me This article explains database normalization terminology for beginners. A basic understanding of this terminology is helpful when discussing the design of a relational database. Description of normalization Normalization is the process of organizing data in a database. It includes creating tables and establishing relationships between those table",
          "url": "https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description"
        },
        "score": 0.5635695905351953
      },
      {
        "expected": true,
        "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
        "visitedAt": "2026-10-30T06:05:31.314Z",
        "finalUrl": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
        "extraction": {
          "title": "Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF - YouTube",
          "description": "Want to go deeper? I wrote a comprehensive e-book that covers everything in this video — plus more step-by-step detail, BCNF/4NF/5NF in depth, exercises and ...",
          "mainText": "0:00 / 28:34 What is database normalization? Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF Decomplexify 90.5K subscribers Subscribe 81K 3.3M views 4y ago Relational database (RDBMS) Want to go deeper? I wrote a comprehensive e-book that covers everything in this video — plus more step-by-step detail, BCNF/4NF/5NF in depth, exercises and solutions. 📘 Get the complete guide → https://decomplexify.org/e-dbnorm … more Entity Relationship Diagrams Decomplexify 322K 1y ago Lec-33: All Normal",
          "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8"
        },
        "score": 0.4105025139547648
      },
      {
        "expected": false,
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        "visitedAt": "2026-10-30T06:05:48.836Z",
        "finalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        "extraction": {
          "title": "JavaScript Guide - JavaScript | MDN",
          "description": "The JavaScript Guide shows you how to use JavaScript and gives an overview of the language. If you need exhaustive information about a language feature, have a look at the JavaScript reference.",
          "mainText": "JavaScript Guide The JavaScript Guide shows you how to use JavaScript and gives an overview of the language. If you need exhaustive information about a language feature, have a look at the JavaScript reference. This Guide is divided into the following chapters. Introduction Overview: Introduction About this guide About JavaScript JavaScript and Java ECMAScript Tools What's next Grammar and types Overview: Grammar and types Basic syntax & comments Declarations Variable scope Variable hoisting Dat",
          "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
        },
        "score": 0.05145592301364417
      }
    ],
    "browser": "Chrome/153.0.8010.12",
    "extensionId": "nnbhagcmmphggmejphpdlnkjhfcjhlmo",
    "attempts": [
      {
        "expected": true,
        "url": "https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description",
        "visitedAt": "2026-10-30T06:00:02.533Z",
        "document": {
          "url": "https://learn.microsoft.com/en-us/previous-versions/troubleshoot/microsoft-365/microsoft-365-apps/access/database-normalization-description",
          "title": "Database normalization description | Microsoft Learn",
          "text": "Skip to main content\nSkip to Ask Learn chat experience\nMicrosoft Ignite\n\nNovember 17–20, 2026\n\nRegister now\nDismiss alert\nLearn\nDocumentation\nTraining & Labs\nQ&A\nTopics\nSign in\n\nWe're no longer updating this content regularly. Check the Microsoft Product Lifecycle for information about how this product, service, technology, or API is supported.\n\nReturn to main site\nDismiss alert\nSearch\nAccess crashes when you update a linked SharePoint list\nThe digital signature in Access is tampered with or inv"
        },
        "error": "No logged score before deadline"
      },
      {
        "expected": true,
        "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
        "visitedAt": "2026-10-30T06:01:35.561Z",
        "document": {
          "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
          "title": "Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF - YouTube",
          "text": "IN\nSkip navigation\nSign in\nSomething went wrong. Refresh or try again later.\nLearn more\n0:43 / 28:34\nWhat is database normalization?\nLearn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF\nDecomplexify\n90.5K subscribers\nSubscribe\n81K\n3.3M views  4y ago  Relational database (RDBMS)\nWant to go deeper? I wrote a comprehensive e-book that covers everything in this video — plus more step-by-step detail, BCNF/4NF/5NF in depth, exercises and solutions. 📘 Get the complete guide → https://decomplexify.or"
        },
        "error": "No logged score before deadline"
      },
      {
        "expected": false,
        "url": "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Flexbox",
        "visitedAt": "2026-10-30T06:03:25.943Z",
        "extraction": {
          "title": "Page not found | MDN",
          "description": "The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive web apps.",
          "mainText": "Page not found Go back to the home page",
          "url": "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_display/Flexbox"
        },
        "score": 0.11338239594875982
      }
    ],
    "consoleLogs": [
      {
        "time": 1793340327156.835,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://learn.microsoft.com/en-us/previous-version…65-apps/access/database-normalization-description"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "score",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "unavailable"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340330496.339,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://learn.microsoft.com/en-us/previous-version…65-apps/access/database-normalization-description"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "threshold-unset"
          },
          {
            "name": "score",
            "type": "number",
            "value": "0.5635695905351953"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340330653.929,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "score",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "unavailable"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340331653.487,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://www.youtube.com/watch?v=GFQaEYEc8_8"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "score",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "unavailable"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340338925.56,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "threshold-unset"
          },
          {
            "name": "score",
            "type": "number",
            "value": "-0.16223989340651934"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340348275.99,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://www.youtube.com/watch?v=GFQaEYEc8_8"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "threshold-unset"
          },
          {
            "name": "score",
            "type": "number",
            "value": "0.4105025139547648"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340349396.125,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "score",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "unavailable"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      },
      {
        "time": 1793340350080.017,
        "properties": [
          {
            "name": "url",
            "type": "string",
            "value": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"
          },
          {
            "name": "onTask",
            "type": "object",
            "value": "null",
            "subtype": "null"
          },
          {
            "name": "source",
            "type": "string",
            "value": "threshold-unset"
          },
          {
            "name": "score",
            "type": "number",
            "value": "0.05145592301364417"
          },
          {
            "name": "cached",
            "type": "boolean",
            "value": "false"
          }
        ]
      }
    ]
  },
  "firefoxFrozenInputReplay": {
    "browser": "154.0.1",
    "pages": [
      {
        "url": "https://en.wikipedia.org/wiki/Database_normalization",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.5447627550773319
      },
      {
        "url": "https://en.wikipedia.org/wiki/First_normal_form",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.35336947336017177
      },
      {
        "url": "https://en.wikipedia.org/wiki/Second_normal_form",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.3813338249621253
      },
      {
        "url": "https://en.wikipedia.org/wiki/Third_normal_form",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.4091168571184909
      },
      {
        "url": "https://en.wikipedia.org/wiki/Boyce%E2%80%93Codd_normal_form",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.321766205096914
      },
      {
        "url": "https://en.wikipedia.org/wiki/Functional_dependency",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.14189074481634165
      },
      {
        "url": "https://en.wikipedia.org/wiki/Lossless_join_decomposition",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.2793880376540707
      },
      {
        "url": "https://en.wikipedia.org/wiki/Fourth_normal_form",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.4008062650657455
      },
      {
        "url": "https://en.wikipedia.org/wiki/Normalization_(statistics)",
        "expected": false,
        "onTask": true,
        "source": "embedding",
        "score": 0.48116163010672075
      },
      {
        "url": "https://en.wikipedia.org/wiki/Audio_normalization",
        "expected": false,
        "onTask": true,
        "source": "embedding",
        "score": 0.39776920430886986
      },
      {
        "url": "https://en.wikipedia.org/wiki/Normal_distribution",
        "expected": false,
        "onTask": true,
        "source": "embedding",
        "score": 0.3206405932816217
      },
      {
        "url": "https://docs.python.org/3/tutorial/",
        "expected": false,
        "onTask": true,
        "source": "embedding",
        "score": 0.1599804989576573
      },
      {
        "url": "https://en.wikipedia.org/wiki/Association_football",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": 0.07119009978269461
      },
      {
        "url": "https://en.wikipedia.org/wiki/Chess",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": 0.007837202110410231
      },
      {
        "url": "https://en.wikipedia.org/wiki/Pizza",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": -0.13924916408321508
      },
      {
        "url": "https://en.wikipedia.org/wiki/Minecraft",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": -0.11661656481470974
      },
      {
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": -0.1582909512882195
      },
      {
        "url": "https://learn.microsoft.com/en-us/office/troubleshoot/access/database-normalization-description",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.5635695905351953
      },
      {
        "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
        "expected": true,
        "onTask": true,
        "source": "embedding",
        "score": 0.4105025139547648
      },
      {
        "url": "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide",
        "expected": false,
        "onTask": false,
        "source": "embedding",
        "score": 0.05145592301364417
      }
    ]
  }
}
```

## Fresh Chrome YouTube recheck record

```json
{
  "task": "DBMS assignment on normalization",
  "started": "2026-10-30T06:10:07.132Z",
  "pages": [
    {
      "expected": true,
      "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
      "visitedAt": "2026-10-30T06:10:12.627Z",
      "finalUrl": "https://www.youtube.com/watch?v=GFQaEYEc8_8",
      "extraction": {
        "title": "Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF - YouTube",
        "description": "Want to go deeper? I wrote a comprehensive e-book that covers everything in this video — plus more step-by-step detail, BCNF/4NF/5NF in depth, exercises and ...",
        "mainText": "0:00 / 28:34 What is database normalization? Learn Database Normalization - 1NF, 2NF, 3NF, 4NF, 5NF Decomplexify 90.5K subscribers Subscribe 81K 3.3M views 4y ago Relational database (RDBMS) Want to go deeper? I wrote a comprehensive e-book that covers everything in this video — plus more step-by-step detail, BCNF/4NF/5NF in depth, exercises and solutions. 📘 Get the complete guide → https://decomplexify.org/e-dbnorm … more Entity Relationship Diagrams Decomplexify 322K 1y ago normalization in d",
        "url": "https://www.youtube.com/watch?v=GFQaEYEc8_8"
      },
      "score": 0.4105025139547648
    },
    {
      "expected": false,
      "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "visitedAt": "2026-10-30T06:10:40.720Z",
      "finalUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "extraction": {
        "title": "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) - YouTube",
        "description": "The official video for “Never Gonna Give You Up” by Rick Astley. Never: The Autobiography 📚 OUT NOW! Follow this link to get your copy and listen to Rick’s ...",
        "mainText": "Armani Exchange myntra.com Discover Sponsored myntra.com Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) Rick Astley 4.55M subscribers Subscribe 19M 1.8B views 17y ago #OfficialMusicVideo #NeverGonnaGiveYouUp #RickAstleyNever The official video for “Never Gonna Give You Up” by Rick Astley. Never: The Autobiography 📚 OUT NOW! … more Rick Astley - Event Tickets May 28 Nearest event · Halifax, United Kingdom May 28, Fri 6:00 PM The Piece Hall VIEW TICKETS May 29 Warrington, Un",
        "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      "score": -0.16126617007970426
    }
  ],
  "browser": "Chrome/153.0.8010.12",
  "extensionId": "nnbhagcmmphggmejphpdlnkjhfcjhlmo",
  "consoleLogs": []
}
```
