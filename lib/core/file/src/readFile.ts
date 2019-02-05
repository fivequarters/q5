import fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);

export default async function readFile(
  path: string,
  options: {
    encoding?: string;
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
