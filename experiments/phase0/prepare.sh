#!/bin/sh
set -eu
cd "$(dirname "$0")/../.."
# Stage existing local files inside the extension root; no downloads or bundler.
mkdir -p experiments/phase0/src/model-host
cp src/config.js experiments/phase0/src/
cp src/model-host/transformers.js experiments/phase0/src/model-host/
cp -R vendor experiments/phase0/
echo 'Load experiments/phase0/manifest.json in Firefox.'
