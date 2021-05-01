import { isFile } from './isFile';
import { readFile } from './readFile';
import { writeFile } from './writeFile';

// ------------------
// Internal Functions
// ------------------

function replaceAll(contents: string, search: string | RegExp, replace: string): string {
  if (search instanceof RegExp) {
    if (search.flags.toLowerCase().indexOf('g') === -1) {
      search = new RegExp(search, search.flags + 'g');
    }
    return contents.replace(search, replace);
  }

  let start = 0;
  let replaced = '';
  while (true) {
    const end = contents.indexOf(search, start);
    if (end === -1) {
      replaced += contents.substr(start);
      return replaced;
    }
    replaced += contents.substring(start, end);
    replaced += replace;
    start = end + search.length;
  }
}

// ------------------
// Exported Functions
// ------------------

export async function replaceInFile(
  path: string,
  replacements: {
    search: string | RegExp;
    replace: string;
  }[],
  options: {
    encoding?: BufferEncoding;
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  if (options.errorIfNotExist || (await isFile(path))) {
    let contents = (await readFile(path, options)).toString();
    for (const replacement of replacements) {
      contents = replaceAll(contents, replacement.search, replacement.replace);
    }
    await writeFile(path, contents, { encoding: options.encoding });
  }
}
