set -x
find . -name tsconfig.tsbuildinfo -exec rm -rf {} \; 2> /dev/null || true
find . -name node_modules -exec rm -rf {} \; 2> /dev/null || true
find . -name libm -exec rm -rf {} \; 2> /dev/null || true
find . -name coverage -exec rm -rf {} \; 2> /dev/null || true
find . -name libc -exec rm -rf {} \; 2> /dev/null || true

rm -rf cli/fusebit-ops-cli/package
rm -rf cli/fusebit-cli/package
rm -rf lib/client/fusebit-editor/dist
