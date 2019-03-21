// ------------------
// Exported Functions
// ------------------

export function startsWith<T>(target: T[], search: T[], areEqual?: (target: T, search: T) => boolean) {
  areEqual = areEqual || ((first: T, second: T) => first === second);
  if (target.length < search.length) {
    return false;
  }

  for (let i = 0; i < search.length; i++) {
    if (!areEqual(target[i], search[i])) {
      return false;
    }
  }

  return true;
}
