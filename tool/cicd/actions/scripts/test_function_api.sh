#!/usr/bin/env bash

# -- Standard Header --
set -e

cd api/function-api
EC2=1 yarn test test/v1/cron.test.ts || true
EC2=1 yarn test test/v1/cron.test.ts || true
EC2=1 yarn test test/v1/cron.test.ts || true
EC2=1 yarn test test/v1/cron.test.ts || true
EC2=1 yarn test test/v1/cron.test.ts || true
