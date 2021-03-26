import fs from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { isDirectory } from './isDirectory';

// ------------------
// Internal Constants
// ------------------

const readdir = promisify(fs.readdir);

// ------------------
// Internal Functions
// ------------------

function joinPaths(path: string, items: string[]) {
  for (let i = 0; i < items.length; i++) {
    items[i] = join(path, items[i]);
  }
}

// ------------------
// Exported Functions
// ------------------

export async function readDirectory(
  path: string,
  options: {
    joinPaths?: boolean;
    recursive?: boolean;
    filesOnly?: boolean;
    errorIfNotExist?: boolean;
    ignore?: string[];
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

  if (options.ignore) {
    items = items.filter((item) => !options.ignore?.includes(item));
  }

  if (options.recursive || options.filesOnly) {
    const filteredItems = [];
    const recursiveOptions = { filesOnly: options.filesOnly, recursive: true, ignore: options.ignore };

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
