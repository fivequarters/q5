import fs from 'fs';
import { join } from 'path';
import { readFile } from '@5qtrs/file';
import globby from 'globby';

import { generateMarkdown } from './markdown';

const FusebitStateFile = '.fusebit-state';
const FusebitMetadataFile = 'fusebit.json';
const DefaultIgnores = ['node_modules', FusebitStateFile];

// Yoinked from fusebit-cli/src/services/BaseComponentService
const loadDirectory = async (dirName: string, entitySpec: any) => {
  const cwd = dirName || process.cwd();

  // Load package.json, if any.  Only include the type for the files parameter, as that's all that's used
  // here.
  let pack: { files: string[] } | undefined;
  try {
    const buffer = await readFile(join(cwd, 'package.json'));
    pack = JSON.parse(buffer.toString());
    entitySpec.data.files['package.json'] = buffer.toString();
  } catch (error) {
    // do nothing
  }

  // Load files in package.files, if any, into the entitySpec.
  const files = await globby((pack && pack.files) || ['*.js'], { cwd, gitignore: true, ignore: DefaultIgnores });
  await Promise.all(
    files.map(async (filename: string) => {
      entitySpec.data.files[filename] = (await readFile(join(cwd, filename))).toString();
    })
  );

  // Load fusebit.json, if any.
  try {
    const buffer = await readFile(join(cwd, FusebitMetadataFile));
    const config = JSON.parse(buffer.toString());

    // Copy over the metadata values
    entitySpec.id = config.id;
    entitySpec.tags = config.tags;
    entitySpec.expires = config.expires;

    // Clean up the known entries
    delete config.id;
    delete config.tags;
    delete config.expires;
    delete config.files;

    // Blind copy the rest into data.
    Object.assign(entitySpec.data, config);
  } catch (error) {
    // do nothing
  }

  delete entitySpec.version;

  return entitySpec;
};

const createCatalogEntry = async (dirName: string) => {
  const catalog = JSON.parse(await readFile(join(dirName, 'catalog.json')));

  if (catalog.description[0] === '#') {
    catalog.description = await generateMarkdown(
      (await readFile(join(dirName, catalog.description.split('#')[1]))).toString()
    );
  }

  const newEntities = await Promise.all(
    catalog.entities.map((entityDir: string) =>
      loadDirectory(join(dirName, entityDir), { data: { configuration: {}, files: {} } })
    )
  );
  catalog.entities = newEntities;

  return catalog;
};

const loadCatalog = async (dirName: string) => {
  const isDirectory = (fileName: string) => {
    return !fs.lstatSync(fileName).isFile();
  };

  const entries = fs
    .readdirSync(dirName)
    .map((fileName) => {
      return join(dirName, fileName);
    })
    .filter(isDirectory);

  const catalog: any[] = [];
  const catalogById: Record<string, string> = {};

  for (const entry of entries) {
    const catalogEntry = await createCatalogEntry(entry);
    if (catalogById[catalogEntry.id]) {
      throw new Error(
        `Duplicate catalog entries for id '${catalogEntry.id}' in ${entry} and ${catalogById[catalogEntry.id]}.`
      );
    }
    catalog.push(catalogEntry);
    catalogById[catalogEntry.id] = entry;
  }

  return catalog;
};

(async () => {
  const entries = await loadCatalog('./inventory');
  console.log(JSON.stringify(entries, null, 2));
})();
