// ------------------
// Internal Functions
// ------------------

function getWhitespace(length: number) {
  return length > 0 ? Array(length + 1).join(' ') : '';
}

// ------------------
// Exported Functions
// ------------------

export function padLeft(text: string, width: number) {
  return `${getWhitespace(width - text.length)}${text}`;
}

export function padRight(text: string, width: number) {
  return `${text}${getWhitespace(width - text.length)}`;
}

export function padCenter(text: string, width: number) {
  const padding = width - text.length;
  if (padding > 0) {
    const pad = getWhitespace(padding >> 1); // tslint:disable-line
    const oddSpace = padding % 2 === 0 ? '' : ' ';
    return `${pad}${text}${pad}${oddSpace}`;
  }
  return text;
}
