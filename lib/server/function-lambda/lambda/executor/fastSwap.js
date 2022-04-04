const fs = require('fs').promises;
const path = require('path');

const sourceDir = '/var/task';
const overrideDir = '/tmp/override';

const writeFile = async (fn, data, encoding) => {
  await fs.mkdir(path.join(overrideDir, path.dirname(fn)), { recursive: true });
  await fs.writeFile(fn, data, { encoding });
};

module.exports = async (spec) => {
  // Clean up any previous debris floating around, and make sure the target is present
  await fs.rmdir(overrideDir, { recursive: true, force: true });
  await fs.mkdir(overrideDir, { recursive: true });

  // Write all of the attached files
  await Promise.all([
    ...Object.entries(spec.files).map(async ([fn, data]) => writeFile(fn, data, 'utf8')),
    ...Object.entries(spec.encodedFiles).map(async ([fn, data]) => writeFile(fn, data.data, data.encoding)),
  ]);

  // Set the current directory to be in the NODE_PATH search paths, so that the node_modules directory doesn't
  // need to be copied over.
  if (!process.env.NODE_PATH.includes(`:${sourceDir}/node_modules`)) {
    process.env.NODE_PATH = process.env.NODE_PATH + `:${sourceDir}/node_modules`;

    // Force the 'module' framework to reload from NODE_PATH.
    require('module')._initPaths();
  }

  // Move the process to the new root.
  process.chdir(overrideDir);

  // Clear the cache of any entries not in node_modules
  Object.keys(require.cache)
    .filter((key) => !key.includes('node_module'))
    .forEach((name) => delete require.cache[name]);

  // Return to execute the new module
  return require(`${overrideDir}/app/index`);
};
