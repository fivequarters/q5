#!/usr/bin/env zx

// libc
console.log(`Cleaning libc directories...`);
await $`find . -name libc -exec rm -rf {} +`;

// coverage
console.log(`Cleaning coverage directories...`);
await $`find . -name coverage -exec rm -rf {} +`;

// libm
console.log(`Cleaning libm directories...`);
await $`find . -name libm -exec rm -rf {} +`;

// node_modules
console.log(`Cleaning node_modules directories...`);
await $`find . -name node_modules -exec rm -rf {} +`;

// tsconfig
console.log(`Cleaning tsconfig.tsbuildinfo files...`);
await $`find . -name tsconfig.tsbuildinfo -exec rm -rf {} +`;

// cli/fusebit-ops-cli/package
console.log(`Cleaning cli/fusebit-ops-cli/package`);
await $`rm -rf cli/fusebit-ops-cli/package`;

// cli/fusebit-cli/package
console.log(`Cleaning cli/fusebit-cli/package`);
await $`rm -rf cli/fusebit-cli/package`;

// lib/client/fusebit-editor/dist
console.log(`Cleaning lib/client/fusebit-editor/dist`);
await $`rm -rf lib/client/fusebit-editor/dist`;
