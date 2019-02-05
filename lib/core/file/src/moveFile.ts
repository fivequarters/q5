import copyFile from './copyFile';
import removeFile from './removeFile';

export default async function moveFile(
  sourcePath: string,
  destinationPath: string,
  options: {
    ensurePath?: boolean;
    errorIfExists?: boolean;
    errorIfNotExist?: boolean;
  } = {}
): Promise<void> {
  await copyFile(sourcePath, destinationPath, options);
  await removeFile(sourcePath);
}
