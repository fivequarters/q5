import { EOL } from 'os';
import { KeyValueException } from './KeyValueException';
import { isObject, isString, isNumber, isBoolean } from '@5qtrs/type';

// ------------------
// Internal Constants
// ------------------

const keyValueRegex = /^(\s*)([^=]+?)(\s*)=(\s*)(.*?)(\s*)$/;
const commentLineRegex = /^\s*\#/;

// ------------------
// Internal Functions
// ------------------

function parseWithMap(data: string) {
  const keyValues: KeyValues = {};
  const keyValuesToLineMap: KeyValues = {};
  const lines = data ? data.split(EOL) : [];

  let index = 0;
  for (const line of lines) {
    if (!commentLineRegex.test(line)) {
      const match = line.match(keyValueRegex);
      if (match) {
        const key = match[2];
        const value = match[5];
        keyValues[key] = value;
        keyValuesToLineMap[key] = index;
      }
    }
    index++;
  }

  return { keyValues, keyValuesToLineMap, lines };
}

// --------------
// Exported Types
// --------------

export type KeyValues = { [property: string]: string | number | boolean | undefined };

export interface StructuredKeyValues {
  values?: KeyValues;
  serialized?: string;
}

// ------------------
// Exported Functions
// ------------------

export function serialize(keyValues: KeyValues) {
  if (!isObject(keyValues)) {
    throw KeyValueException.valuesNotAnObject();
  }

  const lines: string[] = [];
  for (const key of Object.keys(keyValues).sort()) {
    let value = keyValues[key];
    if (value !== undefined) {
      if (!isString(value)) {
        if (isNumber(value) || isBoolean(value)) {
          value = value.toString();
        } else {
          throw KeyValueException.valueNotAString(key);
        }
      }
      lines.push(`${key}=${value}`);
    }
  }
  const data = lines.length > 0 ? lines.join(EOL) : undefined;
  return data;
}

export function parse(data: string) {
  const parsed = parseWithMap(data);
  return parsed.keyValues;
}

export function isEqual(keyValues1: KeyValues, keyValues2: KeyValues) {
  return serialize(keyValues1) === serialize(keyValues2);
}

export function update(previousSeralized: string, current: StructuredKeyValues) {
  if (!current.values) {
    const serialized = current.serialized !== undefined ? current.serialized : previousSeralized;
    return { values: parse(serialized), serialized };
  }

  if (current.serialized !== undefined) {
    if (current.serialized !== previousSeralized) {
      const currentValues = parse(current.serialized);
      if (isEqual(currentValues, current.values)) {
        return current;
      }
      if (!isEqual(parse(previousSeralized), current.values)) {
        throw KeyValueException.serializedAndValuesUpdated(Object.keys(current.values));
      }
      return { values: currentValues, serialized: current.serialized };
    }
  }

  const previousParsed = parseWithMap(previousSeralized);
  const lines = previousParsed.lines;
  const linesToRemove = [];
  for (const key of Object.keys(previousParsed.keyValues)) {
    const currentValue = current.values[key];
    if (currentValue === undefined) {
      linesToRemove.push(previousParsed.keyValuesToLineMap[key]);
    } else if (currentValue !== previousParsed.keyValues[key]) {
      const lineToUpdate = previousParsed.keyValuesToLineMap[key] as number;
      lines[lineToUpdate] = lines[lineToUpdate].replace(keyValueRegex, `$1$2$3=$4${currentValue}$6`);
    }
  }

  const sortedLinesToRemove = linesToRemove.sort();
  while (sortedLinesToRemove.length) {
    const indexToRemove = sortedLinesToRemove.pop() as number;
    lines.splice(indexToRemove, 1);
  }

  for (const key of Object.keys(current.values)) {
    const currentValue = current.values[key];
    if (currentValue !== undefined && previousParsed.keyValues[key] === undefined) {
      lines.push(`${key}=${currentValue}`);
    }
  }

  return { values: current.values, serialized: lines.join(EOL) };
}
