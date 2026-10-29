#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# Stage existing local files inside the extension root; no downloads or bundler.
mkdir -p experiments/phase0/src/model-host
cp src/config.js experiments/phase0/src/
cp src/model-host/transformers.js experiments/phase0/src/model-host/
cp -R vendor experiments/phase0/
mkdir -p experiments/phase0/chrome
cp experiments/phase0/manifests/chrome.json experiments/phase0/chrome/manifest.json
cp experiments/phase0/background.js experiments/phase0/chrome/
cp -R experiments/phase0/src experiments/phase0/vendor experiments/phase0/chrome/
echo 'Load experiments/phase0/manifest.json in Firefox.'
echo 'Load unpacked experiments/phase0/chrome/ in Chrome (116+, --offscreen-document-testing).'
