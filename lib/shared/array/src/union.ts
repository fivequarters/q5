// ------------------
// Exported Functions
// ------------------

export function union<T>(array1: T[], array2: T[], areEqual?: (target: T, search: T) => boolean) {
  areEqual = areEqual || ((first: T, second: T) => first === second);

  const union = [];
  for (let i = 0; i < array1.length; i++) {
    for (let j = 0; j < array2.length; j++) {
      if (areEqual(array1[i], array2[j])) {
        union.push(array1[i]);
        j = array2.length;
      }
    }
  }

  return union;
}
