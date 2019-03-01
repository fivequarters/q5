// ------------------
// Exported Functions
// ------------------

export function toHex(value: string) {
  let converted = '';
  for (const char of value) {
    const bytes = unescape(encodeURIComponent(char));
    for (const byte of bytes) {
      const hexByte = byte.charCodeAt(0).toString(16);
      converted += hexByte.length === 1 ? '0' + hexByte : hexByte;
    }
  }
  return converted;
}

export function fromHex(value: string) {
  if (value.length % 2 !== 0) {
    throw new Error('Uneven number of hex characters.');
  }
  let converted = '';
  for (let index = 0; index < value.length; index += 2) {
    converted += String.fromCharCode(parseInt(value.substr(index, 2), 16));
  }
  return converted;
}
