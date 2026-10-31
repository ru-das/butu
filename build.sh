#!/bin/sh
set -eu

cd -- "$(dirname -- "$0")"

for browser in chrome firefox; do
    output="dist/$browser"
    rm -rf -- "$output"
    mkdir -p -- "$output"
    cp -R src vendor assets "$output/"
    cp "manifests/$browser.json" "$output/manifest.json"
    cp "src/model-host/client-$browser.js" "$output/src/model-host/client.js"
    rm "$output/src/model-host/client-chrome.js" "$output/src/model-host/client-firefox.js"
    if [ "$browser" = firefox ]; then
        rm "$output/src/model-host/offscreen.html" "$output/src/model-host/offscreen.js"
    fi
done

echo 'Built dist/chrome/ and dist/firefox/.'
