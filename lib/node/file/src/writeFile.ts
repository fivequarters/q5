import fs from 'fs';
import { dirname } from 'path';
import { promisify } from 'util';
import { createDirectory } from './createDirectory';
import { isFile } from './isFile';

// ------------------
// Internal Constants
// ------------------

const writeFileAsync = promisify(fs.writeFile);

// ------------------
// Exported Functions
// ------------------

export async function writeFile(
  path: string,
  data: any,
  options: {
    encoding?: BufferEncoding;
    mode?: number;
    ensurePath?: boolean;
    errorIfExists?: boolean;
  } = {}
): Promise<void> {
  options.ensurePath = options.ensurePath === false ? false : true;

  if (options.errorIfExists && (await isFile(path))) {
    throw new Error(`File already exists: ${path}`);
  }

  if (options.ensurePath) {
    await createDirectory(dirname(path));
  }

  await writeFileAsync(path, data, options);
}
