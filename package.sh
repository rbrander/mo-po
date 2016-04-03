#!/bin/sh
clear
echo Packaging...
tar -czf package.tar.gz server.js client host shared assets node_modules package.json preload.html LICENSE README.md
echo Done.
echo
du -h package.tar.gz
echo
