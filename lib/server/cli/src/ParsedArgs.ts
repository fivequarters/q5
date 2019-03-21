import { clone } from '@5qtrs/clone';

// ------------------
// Internal Constants
// ------------------

const longOptionChars = '--';
const shortOptionChar = '-';
const optionEqualChar = '=';
const optionColonChar = ':';
const emptyStringTag = '<empty string>';

// ------------------
// Internal Functions
// ------------------

function parseOption(rawArg: string, rawArgNext: string, parsedOptions: { [index: string]: string[] }) {
  let shortOption = true;
  if (rawArg.startsWith(longOptionChars)) {
    shortOption = false;
  } else if (!rawArg.startsWith(shortOptionChar)) {
    return undefined;
  }

  let name = rawArg;
  let value;
  let nextArgUsed = false;

  let index = rawArg.indexOf(optionEqualChar);
  if (index === -1) {
    index = rawArg.indexOf(optionColonChar);
  }
  if (index !== -1) {
    name = rawArg.substring(0, index);
    value = rawArg.substring(index + 1);
  } else if (rawArgNext && !rawArgNext.startsWith(shortOptionChar)) {
    name = rawArg;
    value = rawArgNext;
    nextArgUsed = true;
  }

  if (name === shortOptionChar) {
    name = `${shortOptionChar}${emptyStringTag}`;
  }
  if (name === longOptionChars) {
    name = `${longOptionChars}${emptyStringTag}`;
  }

  parsedOptions[name] = parsedOptions[name] || [];
  if (value !== undefined) {
    parsedOptions[name].push(value);
  }

  return nextArgUsed;
}

// ----------------
// Exported Classes
// ----------------

export class ParsedArgs {
  public static create(rawArgs: string[]) {
    return new ParsedArgs(rawArgs);
  }
  private optionsProp: { [index: string]: string[] };
  private termsAndArgumentsProp: string[];

  private constructor(rawArgs: string[]) {
    this.optionsProp = {};
    this.termsAndArgumentsProp = [];

    for (let i = 0; i < rawArgs.length; i++) {
      const result = parseOption(rawArgs[i], rawArgs[i + 1], this.optionsProp);
      if (result === undefined) {
        this.termsAndArgumentsProp.push(rawArgs[i]);
      } else if (result) {
        i++;
      }
    }
  }

  public get termsAndArguments() {
    return this.termsAndArgumentsProp.slice();
  }

  public get options() {
    return clone(this.optionsProp);
  }
}
