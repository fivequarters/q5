// ------------------
// Exported Functions
// ------------------

export function toBase64(value: string) {
  return btoa(value);
}

export function fromBase64(value: string) {
  return atob(value);
}
