const { execSync } = require("child_process");
const { resolve } = require("path");

console.log(`\n\u001b[34mFull Yarn Install...\u001b[39m \n`);

execSync("yarn install", { stdio: "inherit" });

console.log(`\n\u001b[34mBuilding Module Conversion Tool...\u001b[39m`);
execSync("yarn build", { cwd: resolve("tool", "convert-module") });
execSync("yarn add ./tool/convert-module", { cwd: __dirname });
execSync("chmod 755 convert-module", { cwd: resolve("node_modules", ".bin") });
console.log("   Done");

console.log(`\n\u001b[34mBuilding Yarn Tool...\u001b[39m`);
execSync("yarn build", { cwd: resolve("lib", "shared", "batch") });
execSync("yarn build", { cwd: resolve("tool", "yarn-tool") });
execSync("yarn add ./tool/yarn-tool", { cwd: __dirname });
execSync("chmod 755 yarn-tool", { cwd: resolve("node_modules", ".bin") });
console.log("   Done\n");
