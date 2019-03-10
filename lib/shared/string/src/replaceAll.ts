// ------------------
// Exported Functions
// ------------------

export function replaceAll(text: string, search: string, replacement: string) {
  const split = text.split(search);
  return split.join(replacement);
}
