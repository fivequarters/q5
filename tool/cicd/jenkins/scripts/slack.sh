#!/usr/bin/env bash
git log -n 3  --pretty=%aN,%h,%s > commit.txt
node tool/cicd/slack-notification/libc/index.js
