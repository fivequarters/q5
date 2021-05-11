import fs from 'fs';
import { promisify } from 'util';

// ------------------
// Internal Constants
// ------------------

const readFileAsync = promisify(fs.readFile);

// ------------------
// Exported Functions
// ------------------

export async function readFile(
  path: string,
  options: {
    encoding?: BufferEncoding;
    mode?: number;
    errorIfNotExist?: boolean;
  } = {}
): Promise<any> {
  try {
    return await readFileAsync(path, options);
  } catch (error) {
    if (options.errorIfNotExist || error.code !== 'ENOENT') {
      throw error;
    }
  }

  return Buffer.alloc(0);
}
