// ------------------
// Exported Functions
// ------------------

export function toHex(value: string) {
  return Buffer.from(value).toString('hex');
}

export function fromHex(value: string) {
  return Buffer.from(value, 'hex').toString();
}
