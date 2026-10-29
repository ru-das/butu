for (const action of ['start', 'status', 'audio', 'compare', 'stop']) {
    document.getElementById(action).addEventListener('click', async () => {
        const reply = await chrome.runtime.sendMessage({
            type: `phase0:lifetime-${action}`,
            endsAt: Date.now() + Number(document.getElementById('minutes').value) * 60_000,
            title: `Third normal form tutorial ${Date.now()}`,
        });
        document.getElementById('result').textContent = JSON.stringify(reply, null, 2);
    });
}
