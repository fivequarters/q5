// ------------------
// Exported Functions
// ------------------

export function stringify(value: any): string {
  if (Array.isArray(value)) {
    return `[${value.map(i => stringify(i === undefined ? null : i)).join(',')}]`;
  } else if (typeof value === 'object' && value !== null) {
    return `{${Object.keys(value)
      .sort()
      .filter(k => value[k] !== undefined)
      .map(k => `${JSON.stringify(k)}:${stringify(value[k])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}
