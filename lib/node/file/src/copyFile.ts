import fs from 'fs';
import { dirname } from 'path';
import { promisify } from 'util';
import { createDirectory } from './createDirectory';
import { isFile } from './isFile';

// ------------------
// Internal Constants
// ------------------

const copyFileAsync = promisify(fs.copyFile);

// ------------------
// Exported Functions
// ------------------

export async function copyFile(
  sourcePath: string,
  destinationPath: string,
  options: {
    ensurePath?: boolean;
    errorIfExists?: boolean;
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  options.ensurePath = options.ensurePath === false ? false : true;

  if (options.errorIfExists && (await isFile(destinationPath))) {
    throw new Error(`File already exists: ${destinationPath}`);
  }

  if (options.errorIfNotExist || (await isFile(sourcePath))) {
    if (options.ensurePath) {
      await createDirectory(dirname(destinationPath));
    }

    await copyFileAsync(sourcePath, destinationPath);
  }
}
