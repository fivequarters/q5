import { homedir } from 'os';
import { join } from 'path';
import { isDirectory, copyDirectory, readFile, writeFile } from '@5qtrs/file';

export async function profileConvert() {
  const flexdProfilePath = join(homedir(), '.flexd');
  const fusebitProfilePath = join(homedir(), '.fusebit');
  const flexdProfileExists = await isDirectory(flexdProfilePath);
  const fusebitProfileExists = await isDirectory(fusebitProfilePath);
  if (flexdProfileExists && !fusebitProfileExists) {
    await copyDirectory(flexdProfilePath, fusebitProfilePath, { recursive: true });

    const settingsFilePath = join(fusebitProfilePath, 'settings.json');
    const settingsJson = await readFile(settingsFilePath);
    if (settingsJson) {
      const settings = JSON.parse(settingsJson);
      if (settings && settings.profiles) {
        for (const profileName in settings.profiles) {
          if (profileName) {
            const profile = settings.profiles[profileName];
            profile.baseUrl = profile.baseUrl.replace('flexd', 'fusebit');
          }
        }
        await writeFile(settingsFilePath, JSON.stringify(settings, null, 2));
      }
    }
  }
}
