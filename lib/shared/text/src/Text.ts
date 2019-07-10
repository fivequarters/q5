import { ensureArray } from '@5qtrs/type';
import { EOL } from 'os';

// ------------------
// Internal Variables
// ------------------

let styledDefault: boolean = true;

// ------------------
// Internal Constants
// ------------------

const noStyle: StyleCodes = [0, 0];
const noIndex: [number, number] = [-1, -1];

const colors: { [index: string]: StyleCodes } = {
  bold: [1, 22],
  dim: [2, 22],
  italic: [3, 23],
  underline: [4, 24],
  inverse: [7, 27],
  hidden: [8, 28],
  black: [30, 39],
  red: [31, 39],
  green: [32, 39],
  yellow: [33, 39],
  blue: [34, 39],
  magenta: [35, 39],
  cyan: [36, 39],
  white: [37, 39],
  gray: [90, 39],
};

// ------------------
// Internal Functions
// ------------------

function getWhitespace(length: number) {
  return length > 0 ? Array(length + 1).join(' ') : '';
}

function nearestWhitespace(text: IText, index: number) {
  while (index > -1) {
    if (text instanceof Text) {
      if (text.characterAt(index) === ' ' || text.characterAt(index) === '\t') {
        break;
      }
    } else {
      if (text[index] === ' ' || text[index] === '\t') {
        break;
      }
    }
    index--;
  }

  return index;
}

// -------------------
// Internal Interfaces
// -------------------

type StyleCodes = [number, number];

// -------------------
// Exported Interfaces
// -------------------

export type IText = string | Text;

// ------------------
// Exported Functions
// ------------------

export function setStyledDefault(value: boolean) {
  styledDefault = value;
}

// ----------------
// Exported Classes
// ----------------

export class Text {
  public get length() {
    if (!this.lengthCached) {
      this.lengthCached = 0;
      for (const segment of this.segments) {
        this.lengthCached += segment.length;
      }
    }

    return this.lengthCached;
  }

  public static empty() {
    return Text.emptyText;
  }

  public static create(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, noStyle);
  }

  public static join(segments: IText[], separator: IText) {
    const allSegments = [];
    if (segments.length) {
      allSegments.push(segments[0]);
      for (let i = 1; i < segments.length; i++) {
        allSegments.push(separator);
        allSegments.push(segments[i]);
      }
    }
    return Text.create(allSegments);
  }

  public static bold(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.bold);
  }

  public static boldItalic(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.bold).italic();
  }

  public static dim(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.dim);
  }

  public static italic(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.italic);
  }

  public static underline(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.underline);
  }

  public static inverse(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.inverse);
  }

  public static hidden(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.hidden);
  }

  public static black(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.black);
  }

  public static red(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.red);
  }

  public static green(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.green);
  }

  public static yellow(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.yellow);
  }

  public static blue(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.blue);
  }

  public static magenta(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.magenta);
  }

  public static cyan(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.cyan);
  }

  public static white(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.white);
  }

  public static gray(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.gray);
  }

  public static grey(text: IText | IText[], ...rest: IText[]) {
    const segments = ensureArray(text);
    segments.push(...rest);
    return new Text(segments, colors.gray);
  }
  public static eol() {
    return Text.eolText;
  }

  private static emptyText: Text = new Text([''], noStyle);
  private static eolText: Text = new Text([EOL], noStyle);
  private lengthCached?: number;
  private stringStyledCached?: string;
  private stringSansStyleCached?: string;
  private segments: IText[];
  private styleCodes: StyleCodes;

  private constructor(segments: IText[], styleCodes: StyleCodes) {
    this.segments = segments.map(segment => (segment === undefined ? '' : segment));
    this.styleCodes = styleCodes;
  }

  public lines() {
    return this.split(EOL);
  }

  public bold() {
    return new Text([this], colors.bold);
  }

  public dim() {
    return new Text([this], colors.dim);
  }

  public italic() {
    return new Text([this], colors.italic);
  }

  public underline() {
    return new Text([this], colors.underline);
  }

  public inverse() {
    return new Text([this], colors.inverse);
  }

  public hidden() {
    return new Text([this], colors.hidden);
  }

  public black() {
    return new Text([this], colors.black);
  }

  public red() {
    return new Text([this], colors.red);
  }

  public green() {
    return new Text([this], colors.green);
  }

  public yellow() {
    return new Text([this], colors.yellow);
  }

  public blue() {
    return new Text([this], colors.blue);
  }

  public magenta() {
    return new Text([this], colors.magenta);
  }

  public cyan() {
    return new Text([this], colors.cyan);
  }

  public white() {
    return new Text([this], colors.white);
  }

  public gray() {
    return new Text([this], colors.gray);
  }

  public grey() {
    return new Text([this], colors.gray);
  }

  public wrap(width: number, indent: string = '', hypen: string = '-') {
    const lines = this.lines();
    const wrapped: Text[] = [];
    indent = indent.length < width ? indent : '';
    for (const line of lines) {
      if (line.length <= width) {
        wrapped.push(line);
      } else {
        let lineToWrap = line;
        while (lineToWrap.length > width) {
          const index = nearestWhitespace(lineToWrap, width);
          if (index > -1) {
            wrapped.push(lineToWrap.substring(0, index).trimRight());
            const remainingLine = lineToWrap.substring(index).trimLeft();
            lineToWrap = indent.length ? Text.create(indent, remainingLine) : remainingLine;
          } else {
            const indexForHypen = width - hypen.length;
            wrapped.push(Text.create(lineToWrap.substring(0, indexForHypen), hypen));
            lineToWrap = lineToWrap.substring(indexForHypen);
          }
        }
        if (lineToWrap.length) {
          wrapped.push(lineToWrap);
        }
      }
    }

    return wrapped;
  }

  public truncate(width: number, ellipsis: string = '…') {
    const lines = this.lines();
    const truncated: Text[] = [];
    ellipsis = ellipsis.length < width ? ellipsis : '';

    for (const line of lines) {
      if (line.length <= width) {
        truncated.push(line);
      } else {
        const widthWithEllipsis = width - ellipsis.length;
        let index = nearestWhitespace(line, widthWithEllipsis);
        if (index === -1) {
          index = widthWithEllipsis;
        }
        const truncatedLine = line.substring(0, index);
        truncated.push(ellipsis.length ? new Text([truncatedLine, ellipsis], this.styleCodes) : truncatedLine);
      }
    }

    return truncated;
  }

  public substring(start: number, end?: number) {
    const startIndexes = this.translateIndex(start);
    if (startIndexes === noIndex) {
      return Text.empty();
    }

    const endIndexes = this.translateIndex(end);
    const segments = this.segments.slice(startIndexes[0], endIndexes[0] === -1 ? undefined : endIndexes[0] + 1);
    if (startIndexes[1] > 0) {
      const firstSegment = segments.shift();
      if (firstSegment) {
        const firstSegmentSubString = firstSegment.substring(startIndexes[1]);
        if (firstSegmentSubString) {
          segments.unshift(firstSegmentSubString);
        }
      }
    }

    if (endIndexes[1] > -1) {
      const lastSegment = segments.pop();
      if (lastSegment) {
        const endIndex = startIndexes[0] === endIndexes[0] ? endIndexes[1] - startIndexes[1] : endIndexes[1];
        const lastSegmentSubString = lastSegment.substring(0, endIndex);
        if (lastSegmentSubString) {
          segments.push(lastSegmentSubString);
        }
      }
    }

    return new Text(segments, this.styleCodes);
  }

  public indexOf(search: IText, from?: number) {
    const searchString = search.toString(false);
    const thisString = this.toString(false);
    return thisString.indexOf(searchString, from);
  }

  public split(separator: IText, limit: number = -1) {
    limit = limit > 0 ? limit : -1;
    const segments: Text[] = [];
    let lastIndex = 0;
    while (true) {
      if (segments.length === limit) {
        return segments;
      }
      const nextIndex = this.indexOf(separator, lastIndex);
      if (nextIndex === -1) {
        segments.push(this.substring(lastIndex));
        return segments;
      } else {
        segments.push(this.substring(lastIndex, nextIndex));
        lastIndex = nextIndex + separator.length;
      }
    }
  }

  public replace(search: IText, replace: IText) {
    const segments = this.split(search);
    return Text.join(segments, replace);
  }

  public padLeft(length: number) {
    const pad = getWhitespace(length - this.length);
    if (!pad) {
      return this;
    }
    return Text.create([pad, this]);
  }

  public padRight(length: number) {
    const pad = getWhitespace(length - this.length);
    if (!pad) {
      return this;
    }
    return Text.create([this, pad]);
  }

  public pad(length: number) {
    const padding = length - this.length;
    if (padding <= 0) {
      return this;
    }

    const pad = getWhitespace(padding >> 1); // tslint:disable-line
    const oddSpace = padding % 2 === 0 ? '' : ' ';
    return Text.create([pad, this, `${pad}${oddSpace}`]);
  }

  public trimLeft() {
    const segments = this.segments.slice();
    let firstSegment = true;
    while (segments.length) {
      const segment = segments[0];
      const trimmed = segment.trimLeft();
      if (trimmed.length === 0) {
        firstSegment = false;
        segments.shift();
      } else if (trimmed.length === segment.length) {
        return firstSegment ? this : new Text(segments, this.styleCodes);
      } else {
        segments[0] = trimmed;
        return new Text(segments, this.styleCodes);
      }
    }

    return Text.empty();
  }

  public trimRight() {
    const segments = this.segments.slice();
    let lastSegment = true;
    while (segments.length) {
      const segment = segments[segments.length - 1];
      const trimmed = segment.trimRight();
      if (trimmed.length === 0) {
        lastSegment = false;
        segments.pop();
      } else if (trimmed.length === segment.length) {
        return lastSegment ? this : new Text(segments, this.styleCodes);
      } else {
        segments[segments.length - 1] = trimmed;
        return new Text(segments, this.styleCodes);
      }
    }

    return Text.empty();
  }

  public trim() {
    return this.trimLeft().trimRight();
  }

  public characterAt(index: number): string | undefined {
    const indexes = this.translateIndex(index);
    if (indexes !== noIndex) {
      const segment = this.segments[indexes[0]];
      return segment instanceof Text ? segment.characterAt(indexes[1]) : segment[indexes[1]];
    }

    return undefined;
  }

  public toString(enableStyle?: boolean): string {
    enableStyle = enableStyle === undefined ? styledDefault : enableStyle;
    return enableStyle ? this.toStringStyled() : this.toStringSansStyle();
  }

  private translateIndex(index: number = -1): [number, number] {
    if (index < 0) {
      return noIndex;
    }

    let segmentIndex = 0;
    let remaining = index;
    while (true) {
      const segment = this.segments[segmentIndex];
      if (!segment) {
        return noIndex;
      } else if (segment.length <= remaining) {
        remaining -= segment.length;
        segmentIndex++;
      } else {
        return [segmentIndex, remaining];
      }
    }
  }

  private toStringSansStyle() {
    if (!this.stringSansStyleCached) {
      const segmentStrings = [];
      for (const segment of this.segments) {
        segmentStrings.push(segment.toString(false));
      }

      this.stringSansStyleCached = segmentStrings.join('');
    }

    return this.stringSansStyleCached;
  }

  private toStringStyled() {
    if (!this.stringStyledCached) {
      const open = this.styleCodes[0] > 0 ? `\u001b[${this.styleCodes[0]}m` : '';
      const close = this.styleCodes[0] > 0 ? `\u001b[${this.styleCodes[1]}m` : '';

      const segmentStrings = [];
      for (const segment of this.segments) {
        segmentStrings.push(segment.toString());
      }

      this.stringStyledCached = `${open}${segmentStrings.join('')}${close}`;
    }

    return this.stringStyledCached;
  }
}
