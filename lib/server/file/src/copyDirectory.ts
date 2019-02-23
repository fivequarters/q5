import { join } from 'path';
import { copyFile } from './copyFile';
import { createDirectory } from './createDirectory';
import { isDirectory } from './isDirectory';
import { readDirectory } from './readDirectory';

// ------------------
// Internal Functions
// ------------------

async function recursiveCopy(sourcePath: string, destinationPath: string, options: any): Promise<void> {
  const items = await readDirectory(sourcePath, { errorIfNotExist: options.errorIfNotExist, recursive: false });

  for (const item of items) {
    const itemSourcePath = join(sourcePath, item);
    const itemDestinationPath = join(destinationPath, item);
    if (await isDirectory(itemSourcePath)) {
      if (options.recursive) {
        const recursiveOptions = {
          errorIfExists: options.errorIfExists,
          errorIfNotExist: options.errorIfNotExist,
          filesOnly: options.filesOnly,
          recursive: true,
        };
        await recursiveCopy(itemSourcePath, itemDestinationPath, recursiveOptions);
      }

      if (!options.filesOnly) {
        await createDirectory(itemDestinationPath);
      }
    } else {
      const copyOptions = {
        ensurePath: true,
        errorIfExists: options.errorIfExists,
      };
      await copyFile(itemSourcePath, itemDestinationPath, copyOptions);
    }
  }
}

// ------------------
// Exported Functions
// ------------------

export async function copyDirectory(
  sourcePath: string,
  destinationPath: string,
  options: {
    ensurePath?: boolean;
    recursive?: boolean;
    filesOnly?: boolean;
    errorIfNotExist?: boolean;
    errorIfExists?: boolean;
  } = {}
): Promise<void> {
  options.ensurePath = options.ensurePath === false ? false : true;
  options.recursive = options.recursive === false ? false : true;

  if (options.errorIfExists && (await isDirectory(destinationPath))) {
    throw new Error(`Directory already exists: ${destinationPath}`);
  }

  const sourceExists = await isDirectory(sourcePath);
  if (options.errorIfNotExist || sourceExists) {
    if (sourceExists) {
      await createDirectory(destinationPath, { ensurePath: options.ensurePath });
    }
    await recursiveCopy(sourcePath, destinationPath, options);
  }
}
