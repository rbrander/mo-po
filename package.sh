#!/bin/sh
clear
echo Packaging...
tar -czf package.tar.gz server.js client server shared assets node_modules package.json LICENSE README.md
echo Done.
echo
du -h package.tar.gz
echo
