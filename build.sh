#!/bin/sh
set -eu

cd -- "$(dirname -- "$0")"

for browser in chrome firefox; do
    output="dist/$browser"
    rm -rf -- "$output"
    mkdir -p -- "$output"
    cp -R src vendor assets "$output/"
    cp "manifests/$browser.json" "$output/manifest.json"
done

echo 'Built dist/chrome/ and dist/firefox/.'
