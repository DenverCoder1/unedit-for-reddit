#!/usr/bin/env bash

# Declare list of files to zip
FILES='images/* vendor/* LICENSE manifest.json README.md script.js'

# Create directory for zip files
mkdir -p dist

############################
# Chrome Extension Archive #
############################

zip -r -X "dist/chrome-extension.zip" $FILES

#############################
# Firefox Extension Archive #
#############################

setup() {
    # Ensure files to move exist
    if [ ! -f manifest-v2.json ] || [ ! -f manifest.json ]; then
        echo "manifest-v2.json or manifest.json was not found. Please run this script from the root of the extension."
        exit 1
    fi
    # Copy the v2 manifest to use instead of the v3 manifest
    mv manifest.json manifest-v3.json && mv manifest-v2.json manifest.json
    # Run cleanup in case of Ctrl+C
    trap cleanup SIGINT
}

cleanup() {
    # Ensure files to move exist
    if [ ! -f manifest-v3.json ] || [ ! -f manifest.json ]; then
        echo "manifest-v3.json or manifest.json was not found. Please run this script from the root of the extension."
        exit 1
    fi
    # Copy the v3 manifest back to the v2 manifest
    mv manifest.json manifest-v2.json && mv manifest-v3.json manifest.json
}

setup
zip -r -X "dist/firefox-extension.zip" $FILES
cleanup
