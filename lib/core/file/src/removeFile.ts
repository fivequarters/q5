import fs from 'fs';
import { promisify } from 'util';

const unlink = promisify(fs.unlink);

export default async function removeFile(
  path: string,
  options: {
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (options.errorIfNotExist || error.code !== 'ENOENT') {
      throw error;
    }
  }
}
