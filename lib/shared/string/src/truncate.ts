import { EOL } from 'os';
import { toLines } from './toLines';
import { nearestWhitespace } from './nearestWhiteSpace';

// ------------------
// Exported Functions
// ------------------

export function truncate(text: string | string[], width: number, ellipsis: string = '…') {
  const lines = toLines(text);
  const truncated: string[] = [];
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
      truncated.push(`${line.substring(0, index)}${ellipsis}`);
    }
  }

  return truncated;
}
