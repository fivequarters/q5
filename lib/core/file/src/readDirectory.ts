import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import isDirectory from './isDirectory';

const readdir = promisify(fs.readdir);

function joinPaths(path: string, items: string[]) {
  for (let i = 0; i < items.length; i++) {
    items[i] = join(path, items[i]);
  }
}

export default async function readDirectory(
  path: string,
  options: {
    joinPaths?: boolean;
    recursive?: boolean;
    filesOnly?: boolean;
    errorIfNotExist?: boolean;
  } = {}
): Promise<string[]> {
  options.recursive = options.recursive === false ? false : true;
  let items: string[] = [];

  try {
    items = await readdir(path);
  } catch (error) {
    if (options.errorIfNotExist || error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (options.recursive || options.filesOnly) {
    const filteredItems = [];
    const recursiveOptions = {
      filesOnly: options.filesOnly,
      recursive: true,
    };

    for (const item of items) {
      const itemPath = join(path, item);
      const isItemDirectory = await isDirectory(itemPath);
      if (!isItemDirectory || !options.filesOnly) {
        filteredItems.push(item);
      }
      if (isItemDirectory && options.recursive) {
        const childItems = await readDirectory(itemPath, recursiveOptions);
        joinPaths(item, childItems);
        filteredItems.push(...childItems);
      }
    }

    items = filteredItems;
  }

  if (options.joinPaths) {
    joinPaths(path, items);
  }

  return items;
}
