import { copyDirectory } from './copyDirectory';
import { removeDirectory } from './removeDirectory';

// ------------------
// Exported Functions
// ------------------

export async function moveDirectory(
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
  await copyDirectory(sourcePath, destinationPath, options);
  await removeDirectory(sourcePath, { recursive: options.recursive });
}
