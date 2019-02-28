// ------------------
// Exported Functions
// ------------------

export function toBase64(value: string) {
  return Buffer.from(value).toString('base64');
}

export function fromBase64(value: string) {
  return Buffer.from(value, 'base64').toString();
}
