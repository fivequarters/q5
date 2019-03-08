import { EOL } from 'os';
import { toLines } from './toLines';
import { nearestWhitespace } from './nearestWhiteSpace';

// ------------------
// Exported Functions
// ------------------

export function wrap(text: string | string[], width: number, indent: string = '  ', hypen: string = '-') {
  const lines = toLines(text);
  const wrapped: string[] = [];
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
          lineToWrap = `${indent}${lineToWrap.substring(index).trimLeft()}`;
        } else {
          const indexForHypen = width - hypen.length;
          wrapped.push(`${lineToWrap.substring(0, indexForHypen)}${hypen}`);
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
