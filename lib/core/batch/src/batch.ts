export function batch<T>(size: number, items: Array<T>): Array<Array<T>> {
  const result: Array<Array<T>> = [];

  if (size > 0 && items.length) {
    let nextBatch: Array<T> = [];
    let i = 0;
    while (i < items.length) {
      nextBatch.push(items[i++]);
      if (nextBatch.length === size) {
        result.push(nextBatch);
        nextBatch = [];
      }
    }
    if (nextBatch.length) {
      result.push(nextBatch);
    }
  }

  return result;
}
