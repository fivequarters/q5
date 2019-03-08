import { toLines } from './toLines';

export function width(text: string | string[]) {
  const lines = toLines(text);
  let max = 0;
  for (const line of lines) {
    max = line.length > max ? line.length : max;
  }
  return max;
}
