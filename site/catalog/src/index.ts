import fs from 'fs';
import { join } from 'path';
import { readFile } from '@5qtrs/file';
import globby from 'globby';

import { loadImports, generateMarkdown } from './markdown';

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
  const imports = await loadImports();
  const catalog = JSON.parse(await readFile(join(dirName, 'catalog.json')));

  if (catalog.description[0] === '#') {
    catalog.description = generateMarkdown(
      `${dirName}/catalog.json/${catalog.description.split('#')[1]}`,
      (await readFile(join(dirName, catalog.description.split('#')[1]))).toString(),
      false,
      imports
    );
  }

  // Load the entities
  await Promise.all(
    Object.entries(catalog.configuration.entities as Record<string, { entityType: string; path: string }>).map(
      async ([name, entityDef]: [string, { entityType: string; path: string }]) => {
        catalog.configuration.entities[name] = await loadDirectory(join(dirName, entityDef.path), {
          entityType: entityDef.entityType,
          data: { configuration: {}, files: {} },
        });
      }
    )
  );

  // Parse any markdown in the entities
  let entityName: string;
  let entity: { data: { files: Record<string, string> } };

  for ([entityName, entity] of Object.entries(
    catalog.configuration.entities as Record<string, { data: { files: Record<string, string> } }>
  )) {
    for (const [fileName, file] of Object.entries(entity.data.files)) {
      if (fileName.match(/\.md$/)) {
        entity.data.files[fileName] = generateMarkdown(`${dirName}/${entityName}/${fileName}`, file, false, imports);
      }
    }
  }

  // Load the schema, uischema, and data
  catalog.configuration.schema = JSON.parse((await readFile(join(dirName, catalog.configuration.schema))).toString());
  catalog.configuration.uischema = JSON.parse(
    (await readFile(join(dirName, catalog.configuration.uischema))).toString()
  );
  catalog.configuration.data = JSON.parse((await readFile(join(dirName, catalog.configuration.data))).toString());

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
