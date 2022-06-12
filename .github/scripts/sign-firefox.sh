#!/usr/bin/env bash

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

sign() {
    # Sign the Firefox extension
    web-ext sign --api-key=$JWT_USER --api-secret=$JWT_SECRET
}

setup
sign
cleanup
