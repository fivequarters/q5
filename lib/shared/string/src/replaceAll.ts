// ------------------
// Exported Functions
// ------------------

export function replaceAll(text: string, search: string, replacement: string) {
  let nextIndex = 0;
  while (true) {
    console.log('DEBUG:', nextIndex);
    nextIndex = text.indexOf(search, nextIndex);
    console.log('DEBUG:', nextIndex, JSON.stringify(text));
    if (nextIndex === -1) {
      return text;
    }
    console.log('DEBUG:', replacement.length);
    text = text.replace(search, replacement);
    nextIndex += replacement.length; //+ (replacement.indexOf('\u001b') >= 0 ? 1 : 0);
  }
}
