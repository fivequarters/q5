// ------------------
// Exported Functions
// ------------------

export function nearestWhitespace(line: string, width: number) {
  let index = width;
  while (index > -1) {
    if (line[index] === ' ' || line[index] === '\t') {
      break;
    }
    index--;
  }

  return index;
}
