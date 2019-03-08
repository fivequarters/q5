import { EOL } from 'os';

export function toLines(text: string | string[]) {
  if (typeof text === 'string') {
    return text.split(EOL);
  }
  const lines = [];
  for (const line of text) {
    lines.push(...line.split(EOL));
  }

  return lines;
}
