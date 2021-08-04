import { v4 as uuidv4 } from 'uuid';

// ------------------
// Internal Constants
// ------------------
const hexLookup: string[] = [];
for (let i = 0; i < 256; ++i) {
  hexLookup[i] = (i + 0x100).toString(16).substr(1);
}

// ------------------
// Internal Functions
// ------------------

function toHexString(buffer: number[]) {
  const hex = [];
  for (const byte of buffer) {
    hex.push(hexLookup[byte]);
  }
  return hex.join('');
}

// ------------------
// Exported Functions
// ------------------

export function random(options?: { lengthInBytes?: number; asByteArray?: boolean }) {
  const length = options && options.lengthInBytes !== undefined ? options.lengthInBytes : 16;
  const asByteArray = options && options.asByteArray !== undefined ? options.asByteArray : false;

  const buffer: number[] = [];
  let iteration: number = 0;
  while (iteration <= length) {
    uuidv4(null, buffer, iteration);
    iteration += 16;
  }

  const byteArray = buffer.slice(0, length);
  return asByteArray ? byteArray : toHexString(byteArray);
}
