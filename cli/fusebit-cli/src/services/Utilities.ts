import * as Path from 'path';
import { IFusebitProfileSettings } from '@5qtrs/fusebit-profile-sdk';

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

export function tryGetFusebit(srcDir?: string) {
  let fusebit: any = undefined;
  try {
    fusebit = require(Path.join(srcDir || process.cwd(), 'fusebit.json'));
  } catch (_) {}
  return fusebit;
}

export function getProfileSettingsFromFusebit(fusebit: any): IFusebitProfileSettings | undefined {
  if (fusebit) {
    let result: IFusebitProfileSettings = { account: fusebit.accountId as string };
    if (fusebit.subscriptionId) result.subscription = fusebit.subscriptionId;
    if (fusebit.boundaryId) result.boundary = fusebit.boundaryId;
    if (fusebit.id) result.function = fusebit.id;
    return result;
  }
  return undefined;
}

export function ensureFusebitMetadata(obj: any, create?: boolean): { [property: string]: any } {
  if (!obj.metadata) {
    if (create) {
      obj.metadata = {};
    } else {
      return {};
    }
  }
  if (!obj.metadata.fusebit) {
    if (create) {
      obj.metadata.fusebit = {};
    } else {
      return {};
    }
  }
  return obj.metadata.fusebit;
}
