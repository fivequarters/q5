import { EOL } from 'os';

// ------------------
// Internal Constants
// ------------------

const keyValueRegex = /^\s*([^=]+?)\s*=\s*(.*?)\s*$/;
const commentLineRegex = /^\s*\#/;

// --------------
// Exported Types
// --------------

export type KeyValue = { [property: string]: string | number | undefined };

// ------------------
// Exported Functions
// ------------------

export function serialize(keyValues: KeyValue) {
  const lines: string[] = [];
  for (const key of Object.keys(keyValues).sort()) {
    const value = keyValues[key];
    if (value) {
      lines.push(`${key}=${value}`);
    }
  }
  const data = lines.length > 0 ? lines.join(EOL) : undefined;
  return data;
}

export function parse(data: string) {
  const keyValues: { [property: string]: string | number } = {};
  const lines = data.split(EOL);

  for (const line of lines) {
    if (!commentLineRegex.test(line)) {
      const match = line.match(keyValueRegex);
      if (match) {
        keyValues[match[1]] = match[2];
      }
    }
  }

  return keyValues;
}
