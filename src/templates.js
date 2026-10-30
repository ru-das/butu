// Original Butu copy. Fill locally with formatTemplate; render with textContent.
// Gentle coaxing for stage 2; {heading} stays on the device.
export const TAUNTS = [
    "You said we'd finish {task} together…",
    "I kept your place beside {task}. Come back soon?",
    "{heading} can wait a little. I'm still here with {task}.",
    "Let's play a game. The game is finishing {task}.",
    "You said we'd do {task} together. I already said yes.",
    "Let's play a game! You do {task}, and I'll stop counting.",
    "I put a little star beside {task}. It was brighter when you were here.",
    "{heading} looks lovely. Is there room for me there?",
    "Just one more page? Okay. That's what we called the last one.",
    "I brought two crayons for {task}. Mine hasn't moved yet.",
    "Shall we take turns with {task}? It's been my turn for a while.",
    "I made a little song about {task}. It keeps coming back to the same bit.",
    "You can tell me all about {heading} after {task}. I'll try to look interested.",
    "I drew a path back to {task}. It's getting rather long.",
    "Is {heading} keeping you company? I was doing that.",
    "I'll hold {task} open. My paws don't get tired. Much.",
    "I found something nice in {task}. I wanted to show you first.",
    "We could make {task} a tiny bit smaller. Then there'd be more room for us.",
    "I whispered your part of our {task} song. It sounded better with you.",
    "It's okay. I can wait beside {task}. Watch how good I've got at it.",
    "I gave {task} a smiley face. Shall I draw yours next to it?",
    "Does {heading} know you promised to sit with me?",
    "I thought I heard you coming back to {task}. I sat up nicely.",
    "One little bit of {task}, then another. We could count those instead.",
];

// Stage 4: still, lonely, trying to smile. Every line names the task.
export const STAGE4_LINES = [
    "I'm still holding our place in {task}.",
    "We can start {task} again. I'll pretend you never left.",
    "I'm smiling. Can we do {task} now?",
    "I kept {task} just how you left it. I practiced being happy, too.",
    "We can start {task} again. I'll say this is the first time.",
    "I wrote {task} until the crayon got small.",
    "Look. There's still room for both of us beside {task}.",
    "I drew us finishing {task}. I don't know what to draw after that.",
    "The song stopped. I'm still here with {task}.",
    "I saved my last little star for {task}. I'd like you to be here for it.",
    "I keep smoothing our page for {task}. It won't lie flat anymore.",
    "Here is {task}. Here is my paw. You can choose where we start.",
];

// Ordered from welcoming to uneasy. Only {task} may enter personalised TTS.
export const VOICE_LINE_TEMPLATES = [
    "Let's do {task} together. I'll stay right here.",
    "Let's do {task} together. You bring the words. I'll bring my best sitting-still.",
    "I saved you a little place beside {task}.",
    "I've saved your place beside {task}. My paw is keeping it warm.",
    "Shall we try one little bit of {task}? I'll count us in. One, two…",
    "I made up a tune for {task}. It needs your part, too.",
    "Shall we go back to {task}? I've nearly run out of little songs.",
    "I said {task} very quietly. In case you were still listening.",
    "I thought we could finish {task} before the music stopped.",
    "I'm ready for {task}. I've been ready the whole time.",
    "I can still say {task} with a smile. Listen.",
    "It's quiet beside {task} now. I've left a little quiet for you.",
];

// Scrapbook captions, from happy memories to careful retellings.
export const DIARY_CAPTIONS = [
    "We spent a little time with {task}. I kept the page for us.",
    "I waited beside {task}. You came back, didn't you?",
    "We worked on {task}. I drew us close enough to share a crayon.",
    "I left a space beside {task} for you. See? Just your shape.",
    "I drew a star each time you came back. Some are pressed quite hard.",
    "This was our {task} day. I coloured in the quiet parts.",
    "I drew us both smiling. It's our diary. We can keep that version.",
    "We made a little more of {task} today. I gave that bit a gold star.",
    "I used my favourite colour for our time together. That part of the page is lovely.",
    "I folded the corner of our {task} page. So we could find each other again.",
    "I tried drawing the waiting. It went over the edge of the paper.",
    "I kept the crayon marks where you came back. I like those better than tidy pages.",
];

// General session-end copy; measured stats are shown separately by the popup.
export const POPUP_SUMMARY_LINES = [
    "We did a little together. Those are my favourite kinds of minutes.",
    "You stayed! I got to use all my happy colours.",
    "You came back. I knew saving your place was a good idea.",
    "I counted the quiet bits. Shall we count the together bits instead?",
    "All finished for today? Okay. I'll put my paw down now.",
];
