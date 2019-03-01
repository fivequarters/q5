import { copyFile, readDirectory, readFile, writeFile } from '@5qtrs/file';
import { transformFileAsync } from '@babel/core';
import { extname } from 'path';

const inputPath = 'libm/';
const outputPath = 'libc/';

async function tranformFile(path: string) {
  const inputCodePath = `${inputPath}${path}`;
  const outputCodePath = `${outputPath}${path}`;
  const inputMapPath = `${inputCodePath}.map`;
  const outputMapPath = `${outputCodePath}.map`;

  if (extname(path) === '.json') {
    await copyFile(inputCodePath, outputCodePath);
  } else if (extname(path) === '.js') {
    let inputSourceMap: any;
    try {
      const inputSourceMapData = await readFile(inputMapPath);
      inputSourceMap = JSON.parse(inputSourceMapData);
    } catch (error) {
      // do nothing
    }

    const tranformOptions: any = {
      plugins: [
        require('babel-plugin-transform-es2015-modules-commonjs'),
        require('@babel/plugin-syntax-dynamic-import'),
      ],
    };

    if (inputSourceMap) {
      tranformOptions.inputSourceMap = inputSourceMap;
    }

    const result = await transformFileAsync(inputCodePath, tranformOptions);

    if (result) {
      await writeFile(outputCodePath, result.code);
      await writeFile(outputMapPath, JSON.stringify(result.map));
    }
  }
}

export async function transform(path: string) {
  const files = await readDirectory(path, { filesOnly: true, recursive: true });
  for (const file of files) {
    await tranformFile(file);
  }
}
