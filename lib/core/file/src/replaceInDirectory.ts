import readDirectory from './readDirectory';
import replaceInFile from './replaceInFile';

export default async function replaceInDirectory(
  path: string,
  replacements: {
    search: string | RegExp;
    replace: string;
  }[],
  options: {
    recursive?: boolean;
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  const readOptions = {
    errorIfNotExist: options.errorIfNotExist,
    filesOnly: true,
    joinPaths: true,
    recursive: options.recursive === false ? false : true,
  };
  const files = await readDirectory(path, readOptions);
  for (const file of files) {
    await replaceInFile(file, replacements);
  }
}
