import * as Path from 'path';
import { IFlexdProfileSettings } from 'lib/server/flexd-profile/libc';

export function serializeKeyValue(data: { [property: string]: string | number | undefined }) {
  const lines: string[] = [];
  Object.keys(data)
    .sort()
    .forEach(key => {
      if (data[key]) {
        lines.push(`${key}=${data[key]}`);
      }
    });
  return lines.length > 0 ? lines.join('\n') : undefined;
}

export function parseKeyValue(data: string) {
  const param = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
  const value: { [property: string]: string | number } = {};
  const lines = data.split(/[\r\n]+/);
  lines.forEach(line => {
    if (/^\s*\#/.test(line)) {
      return;
    }
    const match = line.match(param);
    if (match) {
      value[match[1]] = match[2];
    }
  });
  return value;
}

export function tryGetFlexd(srcDir?: string) {
  let flexd: any = undefined;
  try {
    flexd = require(Path.join(srcDir || process.cwd(), '.flexd', 'function.json'));
  } catch (_) {}
  return flexd;
}

export function getProfileSettingsFromFlexd(flexd: any): IFlexdProfileSettings {
  let result: IFlexdProfileSettings = {};
  if (flexd) {
    if (flexd.subscriptionId) result.subscription = flexd.subscriptionId;
    if (flexd.boundaryId) result.boundary = flexd.boundaryId;
    if (flexd.id) result.function = flexd.id;
  }
  return result;
}
