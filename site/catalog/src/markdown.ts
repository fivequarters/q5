import { readFile, readDirectory } from '@5qtrs/file';
import { join } from 'path';

const importDir = 'markdown';

export const loadImports = async () => {
  const files = await readDirectory(importDir, { filesOnly: true });

  const result: Record<string, string> = {};

  for (const filename of files) {
    result[filename.replace('.md', '')] = (await readFile(join(importDir, filename))).toString();
  }

  return result;
};

export const generateMarkdown = (input: string, imports: Record<string, string>) => {
  const lines = input.split('\n');

  const output: string[] = [];

  const cmdRe = new RegExp('^\\[//]: # \\(([A-Z]*): ([A-Z]*)\\)$');

  lines.forEach((line) => {
    const match = line.match(cmdRe);

    if (match && match[1] === 'IMPORT' && imports[match[2]]) {
      output.push('', `[//]: # (START: ${match[2]})`, '');
      output.push(imports[match[2]]);
      output.push('', `[//]: # (END: ${match[2]})`, '');
    } else {
      output.push(line);
    }
  });

  return output.join('\n');
};
